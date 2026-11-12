import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuariosModule } from './usuarios/usuarios.module';
import { LocalesModule } from './locales/locales.module';
import { AuthModule } from './auth/auth.module';
import { PerfilModule } from './perfil/perfil.module';
import { VisitasModule } from './visitas/visitas.module';
import { ClientesModule } from './clientes/clientes.module';
import { IaModule } from './ia/ia.module';
import { BeneficiosModule } from './beneficios/beneficios.module';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { RespuestaInterceptor } from './common/interceptors/respuesta.interceptor';
import { RespuestaExceptionFilter } from './common/filters/respuesta-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: true, // SOLO en desarrollo
      }),
    }),
    UsuariosModule,
    LocalesModule,
    AuthModule,
    PerfilModule,
    VisitasModule,
    ClientesModule,
    IaModule,
    BeneficiosModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: RespuestaInterceptor },
    { provide: APP_FILTER, useClass: RespuestaExceptionFilter },
  ],
})
export class AppModule {}
