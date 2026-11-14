import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Workbook, type Worksheet } from 'exceljs';
import { Repository } from 'typeorm';
import { calcularNivel } from '../perfil/niveles';
import { PerfilCliente } from '../usuarios/entities/perfil-cliente.entity';
import { Rol } from '../usuarios/entities/usuario.entity';
import { Visita } from '../visitas/entities/visita.entity';
import { ReportesService } from './reportes.service';

const CABECERA = 'FF4A2F26'; // mocha, el mismo de la app
const BORDE = 'FFE0D7CC';

/**
 * Construye el reporte en Excel.
 *
 * Tres hojas: Resumen con las cifras del tablero, Visitas con el detalle
 * movimiento por movimiento, y Clientes con el padrón. Las visitas anuladas
 * también aparecen, marcadas como tales: un reporte que esconde lo que se
 * dio de baja no sirve para auditar nada.
 */
@Injectable()
export class ReporteExcelService {
  constructor(
    @InjectRepository(Visita)
    private readonly visitas: Repository<Visita>,
    @InjectRepository(PerfilCliente)
    private readonly perfiles: Repository<PerfilCliente>,
    private readonly reportesService: ReportesService,
  ) {}

  async generar(localId: string): Promise<Buffer> {
    const libro = new Workbook();
    libro.creator = 'Raíz Contigo';
    libro.created = new Date();

    await this.hojaResumen(libro, localId);
    await this.hojaVisitas(libro, localId);
    await this.hojaClientes(libro, localId);

    const datos = await libro.xlsx.writeBuffer();
    return Buffer.from(datos as ArrayBuffer);
  }

  // ------------------------------------------------------------------

  private async hojaResumen(libro: Workbook, localId: string) {
    const r = await this.reportesService.resumen(localId);
    const hoja = libro.addWorksheet('Resumen');

    hoja.columns = [
      { header: 'Indicador', key: 'indicador', width: 32 },
      { header: 'Valor', key: 'valor', width: 16 },
    ];

    hoja.addRows([
      { indicador: 'Visitas hoy', valor: r.visitas.hoy },
      { indicador: 'Visitas últimos 7 días', valor: r.visitas.ultimos7Dias },
      { indicador: 'Visitas últimos 30 días', valor: r.visitas.ultimos30Dias },
      { indicador: 'Promedio diario', valor: r.visitas.promedioDiario },
      { indicador: '', valor: '' },
      { indicador: 'Clientes activos', valor: r.clientes.activos },
      { indicador: 'Clientes desactivados', valor: r.clientes.inactivos },
      { indicador: 'Nuevos esta semana', valor: r.clientes.nuevosEstaSemana },
      { indicador: 'Sin visitas todavía', valor: r.clientes.sinVisitas },
      { indicador: '', valor: '' },
      ...r.porNivel.map((n) => ({
        indicador: `Nivel ${n.nivel}`,
        valor: n.cantidad,
      })),
      { indicador: '', valor: '' },
      ...r.porDia.map((d) => ({
        indicador: `Visitas ${d.fecha}`,
        valor: d.cantidad,
      })),
    ]);

    this.darFormato(hoja, 2);
  }

  private async hojaVisitas(libro: Workbook, localId: string) {
    const visitas = await this.visitas.find({
      where: { localId },
      relations: { cliente: true, registradaPor: true },
      order: { registradaEn: 'DESC' },
    });

    const hoja = libro.addWorksheet('Visitas');
    hoja.columns = [
      { header: 'Fecha', key: 'fecha', width: 20 },
      { header: 'Cliente', key: 'cliente', width: 24 },
      { header: 'Código', key: 'codigo', width: 38 },
      { header: 'Registrada por', key: 'barista', width: 26 },
      { header: 'Nota', key: 'nota', width: 30 },
      { header: 'Estado', key: 'estado', width: 12 },
    ];

    hoja.addRows(
      visitas.map((v) => ({
        fecha: v.registradaEn,
        cliente: v.cliente?.nombre ?? '',
        codigo: v.cliente?.codigoQr ?? '',
        barista: v.registradaPor?.contacto ?? '',
        nota: v.nota ?? '',
        estado: v.anulada ? 'Anulada' : 'Válida',
      })),
    );

    hoja.getColumn('fecha').numFmt = 'dd/mm/yyyy hh:mm';
    this.darFormato(hoja, 6);
  }

  private async hojaClientes(libro: Workbook, localId: string) {
    const perfiles = await this.perfiles.find({
      where: { usuario: { localId, rol: Rol.CLIENTE } },
      relations: { usuario: true },
      order: { nombre: 'ASC' },
    });

    const hoja = libro.addWorksheet('Clientes');
    hoja.columns = [
      { header: 'Nombre', key: 'nombre', width: 24 },
      { header: 'Contacto', key: 'contacto', width: 28 },
      { header: 'Código', key: 'codigo', width: 38 },
      { header: 'Visitas', key: 'visitas', width: 10 },
      { header: 'Nivel', key: 'nivel', width: 14 },
      { header: 'Pedido de siempre', key: 'producto', width: 20 },
      { header: 'Estado', key: 'estado', width: 14 },
      { header: 'Registrado', key: 'creado', width: 20 },
    ];

    hoja.addRows(
      perfiles.map((p) => ({
        nombre: p.nombre,
        contacto: p.usuario?.contacto ?? '',
        codigo: p.codigoQr,
        visitas: p.totalVisitas,
        nivel: calcularNivel(p.totalVisitas).nivel,
        producto: p.productoFavorito ?? '',
        estado: p.usuario?.activo ? 'Activo' : 'Desactivado',
        creado: p.creadoEn,
      })),
    );

    hoja.getColumn('creado').numFmt = 'dd/mm/yyyy hh:mm';
    this.darFormato(hoja, 8);
  }

  /** Cabecera con color, fila fija al desplazar y filtros automáticos. */
  private darFormato(hoja: Worksheet, columnas: number) {
    const cabecera = hoja.getRow(1);
    cabecera.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cabecera.height = 20;
    cabecera.alignment = { vertical: 'middle' };
    cabecera.eachCell((celda) => {
      celda.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: CABECERA },
      };
      celda.border = { bottom: { style: 'thin', color: { argb: BORDE } } };
    });

    // La fila 1 queda fija: al bajar por el reporte se siguen viendo los títulos.
    hoja.views = [{ state: 'frozen', ySplit: 1 }];

    const ultima = hoja.rowCount;
    if (ultima > 1) {
      hoja.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: columnas },
      };
    }
  }
}
