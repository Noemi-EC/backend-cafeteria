import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { calcularNivel, NIVELES } from '../perfil/niveles';
import { PerfilCliente } from '../usuarios/entities/perfil-cliente.entity';
import { Rol } from '../usuarios/entities/usuario.entity';
import { Visita } from '../visitas/entities/visita.entity';

const DIAS_GRAFICO = 7;

/**
 * Reportes y consultas del local (punto 3.5 de la rúbrica).
 *
 * Todo sale de datos que ya existen: no hay tablas nuevas ni contadores
 * duplicados. Los niveles se calculan con la misma función que usa el
 * perfil del cliente, para que el tablero y la app nunca se contradigan.
 */
@Injectable()
export class ReportesService {
  constructor(
    @InjectRepository(Visita)
    private readonly visitas: Repository<Visita>,
    @InjectRepository(PerfilCliente)
    private readonly perfiles: Repository<PerfilCliente>,
  ) {}

  async resumen(localId: string) {
    const hoy = this.inicioDelDia(new Date());
    const hace7 = this.sumarDias(hoy, -(DIAS_GRAFICO - 1));
    const hace30 = this.sumarDias(hoy, -29);

    const [visitasHoy, visitasSemana, visitasMes] = await Promise.all([
      this.contarVisitasDesde(localId, hoy),
      this.contarVisitasDesde(localId, hace7),
      this.contarVisitasDesde(localId, hace30),
    ]);

    const perfiles = await this.perfiles.find({
      where: { usuario: { localId, rol: Rol.CLIENTE } },
      relations: { usuario: true },
    });

    const activos = perfiles.filter((p) => p.usuario?.activo);

    return {
      generadoEn: new Date(),
      visitas: {
        hoy: visitasHoy,
        ultimos7Dias: visitasSemana,
        ultimos30Dias: visitasMes,
        promedioDiario: Number((visitasSemana / DIAS_GRAFICO).toFixed(1)),
      },
      clientes: {
        total: perfiles.length,
        activos: activos.length,
        inactivos: perfiles.length - activos.length,
        nuevosEstaSemana: perfiles.filter((p) => p.creadoEn >= hace7).length,
        sinVisitas: perfiles.filter((p) => p.totalVisitas === 0).length,
      },
      porNivel: this.agruparPorNivel(activos),
      porDia: await this.visitasPorDia(localId, hace7),
      topClientes: this.top(activos, 5),
      productosFavoritos: this.agruparPorProducto(activos),
    };
  }

  // ---------------------------------------------------------------

  private contarVisitasDesde(localId: string, desde: Date): Promise<number> {
    return this.visitas.count({
      where: { localId, anulada: false, registradaEn: MoreThanOrEqual(desde) },
    });
  }

  /**
   * Visitas por día de los últimos siete, con los días vacíos incluidos.
   * La consulta solo devuelve los días que tuvieron visitas; si no se
   * rellenaran los huecos, el gráfico mentiría sobre la forma de la semana.
   */
  private async visitasPorDia(localId: string, desde: Date) {
    const filas = await this.visitas
      .createQueryBuilder('v')
      .select("date_trunc('day', v.registrada_en)", 'dia')
      .addSelect('COUNT(*)', 'cantidad')
      .where('v.local_id = :localId', { localId })
      .andWhere('v.anulada = false')
      .andWhere('v.registrada_en >= :desde', { desde })
      .groupBy('1')
      .getRawMany<{ dia: Date; cantidad: string }>();

    const mapa = new Map(
      filas.map((f) => [this.clave(new Date(f.dia)), Number(f.cantidad)]),
    );

    return Array.from({ length: DIAS_GRAFICO }, (_, i) => {
      const fecha = this.sumarDias(desde, i);
      return {
        fecha: this.clave(fecha),
        cantidad: mapa.get(this.clave(fecha)) ?? 0,
      };
    });
  }

  private agruparPorNivel(perfiles: PerfilCliente[]) {
    const conteo = new Map<string, number>(
      NIVELES.map((n) => [n.nombre, 0] as [string, number]),
    );

    for (const p of perfiles) {
      const { nivel } = calcularNivel(p.totalVisitas);
      conteo.set(nivel, (conteo.get(nivel) ?? 0) + 1);
    }

    return NIVELES.map((n) => ({
      nivel: n.nombre,
      desde: n.desde,
      cantidad: conteo.get(n.nombre) ?? 0,
    }));
  }

  private agruparPorProducto(perfiles: PerfilCliente[]) {
    const conteo = new Map<string, number>();

    for (const p of perfiles) {
      if (!p.productoFavorito) continue;
      conteo.set(p.productoFavorito, (conteo.get(p.productoFavorito) ?? 0) + 1);
    }

    return Array.from(conteo.entries())
      .map(([producto, cantidad]) => ({ producto, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }

  private top(perfiles: PerfilCliente[], cuantos: number) {
    return [...perfiles]
      .sort((a, b) => b.totalVisitas - a.totalVisitas)
      .slice(0, cuantos)
      .map((p) => ({
        nombre: p.nombre,
        totalVisitas: p.totalVisitas,
        ...calcularNivel(p.totalVisitas),
      }));
  }

  private inicioDelDia(fecha: Date): Date {
    const d = new Date(fecha);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private sumarDias(fecha: Date, dias: number): Date {
    const d = new Date(fecha);
    d.setDate(d.getDate() + dias);
    return d;
  }

  /** "2026-11-13", para comparar días sin que estorbe la hora. */
  private clave(fecha: Date): string {
    const mes = `${fecha.getMonth() + 1}`.padStart(2, '0');
    const dia = `${fecha.getDate()}`.padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }
}
