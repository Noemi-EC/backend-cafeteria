import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { Visita } from '../visitas/entities/visita.entity';
import { ReporteExcelService } from './reporte-excel.service';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Visita]), UsuariosModule, AuthModule],
  controllers: [ReportesController],
  providers: [ReportesService, ReporteExcelService],
})
export class ReportesModule {}
