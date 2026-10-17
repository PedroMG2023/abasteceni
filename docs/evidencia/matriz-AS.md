# Matriz de aplicación de principios SOLID (AS-nn)

## Propósito

Esta matriz se escribe antes que el código para que el código se construya conforme a ella, y no al revés.

- **Diseño.** Cada elemento AS-nn declara cuatro cosas: el principio, la decisión heredada de la serie que lo origina, el elemento de código que debe existir y la verificación que lo demuestra.
- **Evidencia.** La segunda tabla la llena la construcción y prueba que el elemento existe.

El fundamento normativo es doble:

- **El principio.** SWEBOK v4, KA 03 §5.4, menciona SOLID como mnemotecnia de los principios de diseño de clases. KA 03 §1.4 lo sustenta en la modularización (Parnas: una responsabilidad por módulo), la separación de interfaz e implementación, el acoplamiento y la cohesión.
- **La calidad que persigue.** La mantenibilidad de ISO/IEC 25010:2011 y sus cinco subcaracterísticas: modularidad, reusabilidad, analizabilidad, modificabilidad y capacidad de prueba.

La aplicación es proporcional según R-04. La dirección de las dependencias no tiene excepciones; la cantidad de indirección se gradúa según CLAUDE.md §4.

## Tabla de diseño (no se modifica durante la construcción)

Capas según D3 V-01: 1 Presentación · 2 Aplicación / API · 3 Dominio · 4 Infraestructura · T Trabajador (MD-03).

| ID | Principio | Capa | Módulo | Origen en la serie | Elemento de código esperado | Verificación | IT | ISO/IEC 25010:2011 |
|---|---|---|---|---|---|---|---|---|
| AS-01 | S | 3 | M1 | D3 §2.9.2 (nota SYS-FN-03); SYS-FN-01, 03; MD-01 | Máquina de estados de la cuenta comercial en `dominio/m1-usuarios`, separada del servicio del módulo que orquesta repositorio, bitácora y bandeja de salida | Pruebas unitarias sin infraestructura; una transición no prevista es rechazada | IT-02 | Analizabilidad · Capacidad de prueba |
| AS-02 | S | T | Transversal | MD-03; PA-03; ADR-01 | Sondeo de la bandeja (infraestructura), despacho de eventos (aplicación) y entrega por canal (adaptador de Notificador) en tres piezas distintas | Pruebas unitarias de cada pieza con dobles | IT-01 | Modularidad |
| AS-03 | S | 2 | Transversal | D3 §2.9.1 (preocupaciones transversales como envolturas de la capa 2); SYS-NFN-03 | Autenticación, control de rol, límite de peticiones y manejo uniforme de errores como guards, interceptores y filtros separados, nunca dentro de los controladores | Pruebas de integración HTTP: 401, 403 y 429 | IT-01 | Modularidad · Analizabilidad |
| AS-04 | S | 1 | Web | ADR-06; D3 V-01 (capa 1) | Separación entre componente visual (solo renderiza), hook de caso de uso (estado y envío) y cliente API (transporte), en el flujo de registro | Pruebas del hook sin DOM; pruebas del componente con el hook simulado | IT-02 | Analizabilidad |
| AS-05 | O | 4 · T | Transversal | RNF-04 (2.ª cláusula); P-03; R-05; ADR-02 | Puerto Notificador con dos adaptadores (WhatsApp simulado y correo). El segundo se incorpora sin modificar el dominio ni el despachador | El commit que agrega el adaptador de correo no modifica ningún archivo bajo `dominio/` ni el despachador | IT-01 | Modificabilidad |
| AS-06 | O | 2 · T | Transversal | PA-03; ADR-01 | El despachador resuelve los manejadores por tipo de evento registrado en la composición. Un evento nuevo agrega un manejador sin tocar el despachador | Prueba que registra un manejador adicional sin cambios en el despachador | IT-01 | Modificabilidad · Reusabilidad |
| AS-07 | O | 1 | Web | ADR-06; SYS-NFN-11 | Componente de campo de formulario que admite ayuda contextual y validadores por composición. El formulario de registro se arma componiendo, sin modificar el componente base | Pruebas de componente | IT-02 | Modificabilidad · Reusabilidad |
| AS-08 | L | 4 | M9 | MD-04 («el mismo puerto, base real o doble de prueba»); SYS-NFN-15 | Dos implementaciones del puerto de bitácora (memoria y PostgreSQL) | La misma suite de contrato se ejecuta contra ambas | IT-02 | Capacidad de prueba |
| AS-09 | L | 4 · T | Transversal | R-05; ADR-02 | Los adaptadores WhatsApp simulado y correo cumplen el mismo contrato del puerto, incluido el tipo de error de entrega que el interruptor interpreta | Suite de contrato compartida | IT-01 | Capacidad de prueba · Reusabilidad |
| AS-10 | L | 4 | Transversal | ADR-01 | Bandeja de salida en memoria y en PostgreSQL bajo el mismo contrato: persistir dentro de la transacción recibida y entregar en orden | Suite de contrato compartida | IT-01 | Capacidad de prueba |
| AS-11 | L | 1 | Web | PA-07 | La implementación HTTP del cliente API (generada del contrato) y la de prueba son intercambiables | Las pruebas de hooks y componentes corren con la de prueba sin cambios en ellos | IT-01 | Capacidad de prueba |
| AS-12 | I | 3 | M9 | PA-06; ADR-05; SYS-FN-35 | El puerto de bitácora que consumen M1 y M2 declara únicamente `registrar(asiento)`: no ofrece lectura, modificación ni borrado. La lectura administrativa de IT-09 será otra interfaz | Inspección del tipo; prueba de base de datos donde UPDATE y DELETE fallan con el rol de la aplicación | IT-02 | Modularidad |
| AS-13 | I | 3 | Transversal | D5 Anexo B («puerto»); MD-02 | Puertos pequeños separados por necesidad (Notificador, BandejaSalida, Bitacora, AlmacenDocumentos para SYS-FN-02, Reloj), en lugar de un servicio de infraestructura único | Inventario de operaciones por puerto en la tabla de evidencia | IT-01 · IT-02 | Modularidad |
| AS-14 | I | 1 | Web | ADR-06 | Cada componente recibe solo las props que usa, tipadas, y no el objeto completo de la cuenta. Cada hook expone solo lo que la vista consume | Inspección de tipos | IT-02 | Modularidad · Analizabilidad |
| AS-15 | D | 3 | Todos | PA-01; MD-02; D5 Anexo B (invariante PA_01) | El dominio no importa NestJS, el ORM, el controlador de PostgreSQL ni ninguna otra capa. La infraestructura implementa los puertos que el dominio declara | Regla `pa-01-dominio-puro` en la CI | IT-00 | Modularidad · Modificabilidad |
| AS-16 | D | 2 · 3 · 4 | Todos | PA-02; DM-06; MT-03; criterio de salida de IT-00 | Un módulo solo importa el `index.ts` público de otro; ningún módulo importa definiciones de esquema de otro | Regla `pa-02-fronteras-modulo` más la prueba negativa: acceso cruzado deliberado que la CI debe rechazar | IT-00 | Modularidad |
| AS-17 | D | Composición | Transversal | PA-01; R-05 | Raíz de composición única: los adaptadores se enlazan a los puertos por símbolo y el dominio se construye con fábricas, sin decoradores del marco | Inspección; prueba que sustituye un adaptador por un doble desde la composición | IT-01 | Modificabilidad |
| AS-18 | D | 1 | Web | PA-07; ADR-06 | Hooks y componentes dependen de la interfaz `ClienteApi` provista por contexto. Ninguno llama a `fetch` ni importa el cliente concreto | Regla `web-cliente-abstracto` en la CI | IT-01 | Modificabilidad · Capacidad de prueba |
| AS-19 | S | 3 | M6 | MD-04: servicio, máquina de estados, política de rondas y cálculo del precio de referencia como cuatro partes | Evidencia de diseño. Se materializa en IT-06 | Correspondencia con MD-04 | IT-06 | Analizabilidad · Modificabilidad |
| AS-20 | O | 3 | M6 | MD-04: el límite de rondas (SYS-FN-20) y el rango del histograma son parámetros que cambian; la máquina de estados no | Evidencia de diseño. Un cambio del límite de rondas modifica la política y no la máquina de estados. Se materializa en IT-06 | Correspondencia con MD-04 | IT-06 | Modificabilidad |

Reparto: cinco elementos de frontend (AS-04, 07, 11, 14, 18), uno por principio; trece de backend y composición; dos de diseño (AS-19, AS-20).

## Tabla de evidencia (la llena la construcción)

Estados posibles:

- **Pendiente:** aún no construido.
- **Evidenciado:** el código y la verificación existen y la CI está en verde.
- **Diseño:** el elemento se respalda en un modelo de D5 y no tiene código en el alcance vigente.
- **Discrepancia:** la realidad difiere del diseño; se detalla en `discrepancias.md`.

| ID | Estado | Archivo y líneas | Commit | Prueba o regla | Resultado de CI |
|---|---|---|---|---|---|
| AS-01 | Pendiente | | | | |
| AS-02 | Pendiente | | | | |
| AS-03 | Pendiente | | | | |
| AS-04 | Pendiente | | | | |
| AS-05 | Pendiente | | | | |
| AS-06 | Pendiente | | | | |
| AS-07 | Pendiente | | | | |
| AS-08 | Pendiente | | | | |
| AS-09 | Pendiente | | | | |
| AS-10 | Pendiente | | | | |
| AS-11 | Pendiente | | | | |
| AS-12 | Pendiente | | | | |
| AS-13 | Pendiente | | | | |
| AS-14 | Pendiente | | | | |
| AS-15 | Pendiente | | | | |
| AS-16 | Pendiente | | | | |
| AS-17 | Pendiente | | | | |
| AS-18 | Pendiente | | | | |
| AS-19 | Diseño | D5 §2.12.4 (MD-04) | — | — | — |
| AS-20 | Diseño | D5 §2.12.4 (MD-04) | — | — | — |
