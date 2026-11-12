import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, MoreThan, Repository } from 'typeorm';
import { calcularNivel } from '../perfil/niveles';
import { PerfilCliente } from '../usuarios/entities/perfil-cliente.entity';
import { EventosGateway } from '../eventos/eventos.gateway';
import { ActualizarVisitaDto } from './dto/actualizar-visita.dto';
import { RegistrarVisitaDto } from './dto/registrar-visita.dto';
import { Visita } from './entities/visita.entity';

/**
 * Lógica de negocio de las visitas (punto 3.3 de la rúbrica).
 *
 *   registrar      -> registrar datos
 *   listar*        -> consultar información
 *   actualizarNota -> actualizar registros
 *   anular         -> eliminar registros (borrado lógico)
 *
 * Todo lo que depende del local se filtra por localId, que sale del token
 * y nunca del cuerpo de la petición: así un barista no puede tocar las
 * visitas de otra cafetería aunque mande el id a mano.
 */
@Injectable()
export class VisitasService {
  constructor(
    @InjectRepository(Visita)
    private readonly visitas: Repository<Visita>,
    @InjectRepository(PerfilCliente)
    private readonly perfiles: Repository<PerfilCliente>,
    private readonly dataSource: DataSource,
    private readonly eventos: EventosGateway,
    private readonly config: ConfigService,
  ) {}

  /** Minutos que deben pasar entre dos visitas del mismo cliente. 0 = sin límite. */
  private get minutosEspera(): number {
    return Number(this.config.get<string>('VISITA_MINUTOS_ESPERA') ?? 30);
  }

  private presentar(visita: Visita, nombreCliente?: string | null) {
    return {
      id: visita.id,
      nota: visita.nota,
      registradaEn: visita.registradaEn,
      anulada: visita.anulada,
      cliente: nombreCliente ?? visita.cliente?.nombre ?? null,
    };
  }

  /** Registrar datos: una visita nueva, con el contador del cliente al día. */
  async registrar(dto: RegistrarVisitaDto, localId: string, baristaId: string) {
    // Transacción: o se guardan la visita y el nuevo total, o no se guarda
    // ninguno de los dos. Nunca una visita sin contar.
    const resultado = await this.dataSource.transaction(async (manager) => {
      const perfil = await manager.findOne(PerfilCliente, {
        where: { codigoQr: dto.codigoQr.trim() },
        relations: { usuario: true },
      });

      if (!perfil) {
        throw new NotFoundException('No existe un cliente con ese código');
      }
      if (perfil.usuario.localId !== localId) {
        throw new ForbiddenException('Ese cliente pertenece a otro local');
      }
      if (!perfil.usuario.activo) {
        throw new ConflictException('La cuenta de ese cliente está desactivada');
      }

      // Una visita es una ida a la cafetería, no un escaneo. Sin esta regla
      // el mismo código leído tres veces seguidas suma tres visitas, y el
      // nivel de fidelización deja de significar nada.
      if (this.minutosEspera > 0) {
        const desde = new Date(Date.now() - this.minutosEspera * 60_000);
        const reciente = await manager.findOne(Visita, {
          where: {
            clienteId: perfil.id,
            anulada: false,
            registradaEn: MoreThan(desde),
          },
          order: { registradaEn: 'DESC' },
        });

        if (reciente) {
          const hace = Math.max(
            1,
            Math.round((Date.now() - reciente.registradaEn.getTime()) / 60000),
          );
          throw new ConflictException(
            `${perfil.nombre} ya registró una visita hace ${hace} min. Debe pasar ${this.minutosEspera} min entre visitas.`,
          );
        }
      }

      const nivelAnterior = calcularNivel(perfil.totalVisitas).nivel;

      const visita = manager.create(Visita, {
        localId,
        clienteId: perfil.id,
        registradaPorId: baristaId,
        nota: dto.nota?.trim() || null,
      });
      await manager.save(visita);

      perfil.totalVisitas += 1;
      await manager.save(perfil);

      const estado = calcularNivel(perfil.totalVisitas);

      return {
        visita: this.presentar(visita, perfil.nombre),
        cliente: {
          id: perfil.id,
          nombre: perfil.nombre,
          totalVisitas: perfil.totalVisitas,
          ...estado,
        },
        subioDeNivel: estado.nivel !== nivelAnterior,
        usuarioId: perfil.usuarioId,
      };
    });

    // El aviso sale DESPUÉS de que la transacción confirmó. Si se emitiera
    // adentro y luego fallara el commit, los clientes verían una visita
    // que en la base de datos nunca existió.
    const { usuarioId, ...publico } = resultado;
    this.eventos.emitirVisitaRegistrada(localId, usuarioId, publico);

    return publico;
  }

  /** Consultar información: el historial del cliente que pregunta. */
  async listarDeCliente(usuarioId: string) {
    const perfil = await this.perfiles.findOne({ where: { usuarioId } });
    if (!perfil) {
      throw new NotFoundException('Este usuario no tiene perfil de cliente');
    }

    const visitas = await this.visitas.find({
      where: { clienteId: perfil.id, anulada: false },
      order: { registradaEn: 'DESC' },
    });

    return visitas.map((v) => this.presentar(v, perfil.nombre));
  }

  /** Consultar información: las últimas visitas del local, para el barista. */
  async listarDelLocal(localId: string) {
    const visitas = await this.visitas.find({
      where: { localId, anulada: false },
      relations: { cliente: true },
      order: { registradaEn: 'DESC' },
      take: 50,
    });

    return visitas.map((v) => this.presentar(v));
  }

  /** Actualizar registros: corregir la nota de una visita ya registrada. */
  async actualizarNota(id: string, localId: string, dto: ActualizarVisitaDto) {
    const visita = await this.buscarDelLocal(id, localId);

    if (visita.anulada) {
      throw new ConflictException('No se puede editar una visita anulada');
    }

    visita.nota = dto.nota?.trim() || null;
    await this.visitas.save(visita);

    return this.presentar(visita);
  }

  /**
   * Eliminar registros: anula la visita y devuelve el contador a su sitio.
   * Es un borrado lógico, no un DELETE: la fila queda como constancia de
   * que la visita existió y de que alguien la anuló.
   */
  async anular(id: string, localId: string) {
    const resultado = await this.dataSource.transaction(async (manager) => {
      const visita = await manager.findOne(Visita, {
        where: { id, localId },
        relations: { cliente: true },
      });

      if (!visita) {
        throw new NotFoundException('La visita no existe en este local');
      }
      if (visita.anulada) {
        throw new ConflictException('Esta visita ya estaba anulada');
      }

      visita.anulada = true;
      visita.anuladaEn = new Date();
      await manager.save(visita);

      const perfil = visita.cliente;
      perfil.totalVisitas = Math.max(0, perfil.totalVisitas - 1);
      await manager.save(perfil);

      return {
        visita: this.presentar(visita, perfil.nombre),
        cliente: {
          id: perfil.id,
          nombre: perfil.nombre,
          totalVisitas: perfil.totalVisitas,
          ...calcularNivel(perfil.totalVisitas),
        },
        usuarioId: perfil.usuarioId,
      };
    });

    const { usuarioId, ...publico } = resultado;
    this.eventos.emitirVisitaAnulada(localId, usuarioId, publico);

    return publico;
  }

  private async buscarDelLocal(id: string, localId: string): Promise<Visita> {
    const visita = await this.visitas.findOne({
      where: { id, localId },
      relations: { cliente: true },
    });

    if (!visita) {
      throw new NotFoundException('La visita no existe en este local');
    }

    return visita;
  }
}
