import { Injectable, Logger, type CallHandler, type ExecutionContext, type NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';

// Traza estructurada de cada petición (D3 §2.9.1). Registra la ruta declarada,
// no la URL concreta ni el cuerpo: ningún dato personal llega a la traza (V-03).
// El estado se lee al terminar la respuesta: en una petición fallida lo fija el
// filtro de errores después de este interceptor.
@Injectable()
export class RegistroPeticionesInterceptor implements NestInterceptor {
  private readonly registro = new Logger('Peticiones');

  intercept(contexto: ExecutionContext, siguiente: CallHandler): Observable<unknown> {
    const inicio = performance.now();
    const http = contexto.switchToHttp();
    const peticion = http.getRequest<Request>();
    const respuesta = http.getResponse<Response>();
    respuesta.once('finish', () => {
      const ruta = (peticion.route as { path?: string } | undefined)?.path ?? 'desconocida';
      this.registro.log(`${peticion.method} ${ruta} ${respuesta.statusCode} ${Math.round(performance.now() - inicio)} ms`);
    });
    return siguiente.handle();
  }
}
