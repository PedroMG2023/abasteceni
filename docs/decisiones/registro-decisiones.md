# Registro de decisiones

Registro vivo de decisiones conforme a PR-11 (D4 §2.11), con el formato abreviado de D3 §2.7.2. ADR-01 a ADR-06 se transcriben literalmente de D3 §2.7.2; cualquier diferencia con D3 es un error de transcripción y prevalece D3. ADR-07 es la primera decisión de construcción: instancia la arquitectura de D3 sin modificarla.

| **#** | **Decisión** | **Alternativa descartada** | **Justificación y compensación aceptada** |
| --- | --- | --- | --- |
| **ADR-01** | Patrón de bandeja de salida transaccional (Outbox) para publicar eventos de dominio. | Publicación directa a una cola desde el código de negocio. | Garantiza que el evento se persista en la misma transacción que el cambio de estado, evitando notificaciones de cotizaciones inexistentes o cotizaciones sin notificar. Se acepta la latencia adicional del sondeo periódico de la tabla. |
| **ADR-02** | Interruptor de circuito (Circuit Breaker) sobre la integración con WhatsApp Business API. | Reintentos indefinidos sin límite. | Un proveedor externo caído dejaría de consumir recursos del trabajador y de degradar en cascada al resto de tareas programadas. Se acepta que durante la apertura del circuito las notificaciones se acumulen y se entreguen con retraso. |
| **ADR-03** | Réplica de lectura dedicada para el motor de búsqueda y el tablero administrativo. | Consultar siempre el nodo primario. | Aísla las consultas de filtrado multicriterio de RF-03 y las agregaciones del tablero de SYS-FN-33, protegiendo el rendimiento de escritura. Se acepta un retardo de replicación de pocos segundos, tolerable en búsquedas e indicadores. |
| **ADR-04** | Autenticación sin estado mediante credenciales firmadas de vida corta y credencial de renovación. | Sesiones en memoria del servidor. | Es condición necesaria para que las instancias de aplicación sean intercambiables y el escalamiento horizontal de RNF-05 funcione sin sesiones fijadas a un nodo. Se acepta la complejidad de gestionar la revocación y el límite de dos dispositivos de SYS-FN-08. |
| **ADR-05** | Tabla de auditoría de solo adición, con permisos de actualización y borrado revocados a nivel del gestor de base de datos. | Control de inmutabilidad implementado en el código de la aplicación. | RF-10 exige inmutabilidad verificable por inspección; un control situado en el código puede eludirse por error o por una ruta no prevista. Se acepta que las correcciones deban registrarse como asientos compensatorios y nunca como modificaciones. |
| **ADR-06** | Interfaz cliente responsiva desacoplada que consume la API REST, con entrega de activos por red de distribución de contenido. | Renderizado íntegro en el servidor. | Permite cumplir el presupuesto de 2,5 MB y los umbrales sobre 3G de RNF-01 y P-08, y habilita reutilizar la misma API si en el futuro se construyen clientes nativos. Se acepta mayor complejidad inicial en el desarrollo de la interfaz. |
| **ADR-07** | Pila de construcción en TypeScript: Node.js en versión LTS en el servidor; NestJS para la capa de aplicación y la raíz de composición; React con Vite para la capa de presentación; PostgreSQL como gestor de base de datos, con un esquema por módulo y un esquema transversal para la bandeja de salida. | Python con FastAPI y React; Java con Spring Boot y React. | Un solo lenguaje en las cuatro capas reduce la carga de un equipo de dos personas (P-07, C-07) y permite generar los tipos del cliente desde el contrato OpenAPI (PA-07, SYS-NFN-16). El contenedor de inyección de NestJS concentra la composición en un único punto fuera del dominio, que es donde PA-01 se realiza sin que el dominio importe el marco. PostgreSQL admite esquemas por módulo (PA-02), transacciones que abarcan la tabla de negocio y la bandeja de salida (ADR-01), revocación de actualización y borrado por rol (ADR-05) y réplica de lectura nativa (ADR-03). Ningún componente tiene costo de licencia (RNF-08). Se acepta que las interfaces de TypeScript no existen en tiempo de ejecución, por lo que la inyección de puertos exige símbolos explícitos, y que el ecosistema npm amplía la superficie de dependencias de terceros, contenida con archivo de bloqueo y auditoría de dependencias en la integración continua. |
| **ADR-08** | Límite de peticiones (SYS-NFN-03) en dos niveles: en el balanceador en producción y en un guard de la capa 2 cuyo contador por IP y ventana de un minuto reside en PostgreSQL, en el esquema `plataforma`. | Un solo contador en la memoria de cada proceso, o el límite únicamente en el balanceador. | La serie ubica el límite en tres lugares: la capa 4 en D2 (columna de SYS-NFN-03), el balanceador en D3 V-04 y D5 MD-05, y la capa 2 entre las responsabilidades de D3 V-01. Los dos niveles los concilian. Un contador en memoria multiplicaría el límite por el número de instancias, incumpliría SYS-NFN-03 bajo escalamiento horizontal (RNF-05) y contradiría PA-04, que exige que el estado compartido resida en la base de datos o en la caché distribuida. Limitar solo en el balanceador dejaría sin verificación automática el 429 que exige AS-03. Se acepta una escritura en la base de datos por petición, que es tolerable con el techo de 500 concurrentes de SYS-NFN-06 y sustituible por la caché distribuida de V-04 sin cambiar el puerto. |
| **ADR-09** | Alojamiento de los servidores en la nube pública Microsoft Azure, región principal México Central (alternativa: Centro-Sur de EE. UU.), con servicios gestionados: Front Door Standard, Container Apps, PostgreSQL Flexible Server, Blob Storage, Key Vault y Entra ID. El detalle está en el informe 5 (`docs/red/`). | Servidores en las instalaciones de la sede; esquema híbrido. | Sin personal de operación (RO-02) ni presupuesto de licencias (RO-03), solo los servicios gestionados realizan V-04 y MD-05 sin contradecir la organización. Azure ofrece PostgreSQL gestionado con réplica de lectura (ADR-03), escalamiento de instancias sin estado (RNF-05), límite de tasa en el borde (ADR-08), archivo inmutable para la bitácora (ADR-05, SYS-NFN-04), segregación por rol con MFA (RO-04) y crédito para estudiantes sin tarjeta. Se acepta la dependencia de un proveedor, contenida porque el contenedor y PostgreSQL son portables. También se acepta la transferencia internacional de datos personales, que el consentimiento de SYS-FN-36 debe informar (Ley No. 787). |

## Fundamento de ADR-07

### Contexto

Los documentos D1 a D5 son deliberadamente neutrales respecto de la tecnología: D3 nombra «el marco web» y «el gestor de base de datos» en abstracto (PA-01, V-01) y D5 escribe los modelos de análisis con independencia de la plataforma (DML-05). La construcción exige fijar una pila, y D3 §2.7.4 establece que toda propuesta que afecte a la realización de la arquitectura pasa por una decisión explícita. ADR-07 es esa decisión. No altera PA-01 a PA-07, ADR-01 a ADR-06, las fronteras de M1 a M9 ni los modelos de D5: los realiza.

### Núcleo de la decisión (vinculante)

| Componente | Capa o función | Requisitos y decisiones a los que sirve | Licencia |
| --- | --- | --- | --- |
| TypeScript sobre Node.js (versión LTS vigente) | Lenguaje y entorno de ejecución en servidor y cliente | P-07, C-07, PA-07 | Apache-2.0 / MIT |
| NestJS | Capa 2 y raíz de composición del servicio de aplicación y del trabajador | PA-01 (composición fuera del dominio), MD-03 | MIT |
| React con Vite | Capa 1, interfaz responsiva desacoplada | ADR-06, SYS-NFN-08, 09, 10 | MIT |
| PostgreSQL | Persistencia: esquema por módulo, esquema `plataforma` para la bandeja de salida, roles diferenciados | PA-02, ADR-01, ADR-03, ADR-05 | PostgreSQL License |

Las versiones exactas se fijan en el archivo de bloqueo al ejecutar IT-00 y se registran en `docs/evidencia/iteraciones.md`.

### Herramientas complementarias

Son sustituibles por un equivalente sin nueva decisión, siempre que el cambio se registre en `docs/evidencia/iteraciones.md` y el sustituto conserve la función y la licencia libre.

| Herramienta | Uso | Sirve a | Licencia |
| --- | --- | --- | --- |
| Drizzle ORM | Acceso a datos con esquemas de PostgreSQL y migraciones en SQL | PA-02, ADR-05 | Apache-2.0 |
| Jest | Pruebas y cobertura del backend | SYS-NFN-15, DM-04 cond. 2 | MIT |
| Vitest y Testing Library | Pruebas del frontend | DM-04 | MIT |
| Testcontainers | PostgreSQL real en pruebas de integración | ADR-01, ADR-05 | MIT |
| dependency-cruiser | Verificación automática de dependencias | DM-06, PR-08, MT-03 | MIT |
| opossum | Interruptor de circuito en el trabajador | ADR-02 | Apache-2.0 |
| argon2 | Derivación de clave para credenciales | V-03 | MIT |
| openapi-typescript y openapi-fetch | Tipos y cliente HTTP generados del contrato | PA-07, SYS-NFN-10 | MIT |
| Validador OpenAPI en pruebas | Conformidad de las respuestas con el contrato | PA-07, SYS-NFN-16 | MIT |
| Redocly CLI | Lint del contrato | SYS-NFN-16 | MIT |
| GitHub Actions | Integración continua | DM-06 | Servicio sin costo en repositorio público; cuota mensual gratuita en privado |
| Docker Compose | PostgreSQL local | IT-00 | Apache-2.0 |
| PlantUML y Graphviz | Figuras derivadas de los modelos y grafo de dependencias | DML-03 | Libre |

### Comparación con los criterios de D3 §2.5

La elección de la arquitectura ya se resolvió con la matriz ponderada de D3 §2.6.4. Aquí los mismos criterios actúan como filtro cualitativo. Asignar puntuaciones numéricas a lenguajes que satisfacen la arquitectura por igual produciría una precisión aparente que el análisis no sostiene.

| Criterio (peso en D3) | TypeScript / NestJS | Python / FastAPI | Java / Spring Boot |
| --- | --- | --- | --- |
| C-01 Separación de responsabilidades (12 %) | Neutral: la arquitectura la impone | Neutral | Neutral |
| C-02 Bajo acoplamiento y alta cohesión (12 %) | Contenedor de inyección por módulos; puertos por símbolo | Inyección por funciones, menos estructurada para puertos | Ventaja: interfaces presentes en ejecución y contenedor maduro |
| C-03 Escalabilidad (13 %) | Neutral: instancias sin estado | Neutral | Neutral |
| C-04 Seguridad y cumplimiento (15 %) | Desventaja: mayor superficie de dependencias npm, compensada con bloqueo y auditoría | Neutral | Ventaja: ecosistema de seguridad maduro |
| C-05 Mantenibilidad y capacidad de prueba (15 %) | Tipado estático y suites de contrato parametrizables | Tipado opcional: desventaja ligera | Ventaja: tipado estático más estricto |
| C-06 Rendimiento (12 %) | Suficiente para 500 concurrentes | Suficiente | Suficiente, con mayor consumo de memoria |
| C-07 Costo y simplicidad (13 %) | **Ventaja decisiva:** un lenguaje en las cuatro capas y entorno ligero | Desventaja: dos lenguajes | Desventaja: dos lenguajes y entorno más pesado, que encarece las instancias (RNF-08) |
| C-08 Interoperabilidad (8 %) | Ventaja: el mismo contrato genera los tipos del cliente sin cambiar de lenguaje | Neutral | Neutral |

Lectura: Java aventaja en C-02, C-04 y C-05, pero lo hace a costa de C-07, que sirve a dos preocupaciones críticas (P-04 y P-07). La desventaja de TypeScript en C-04 es la única que exige compensación expresa, y la recibe en la propia decisión.

### Condiciones de revisión

ADR-07 se revisa mediante una decisión nueva si ocurre alguna de estas dos situaciones:

- la auditoría de dependencias reporta una vulnerabilidad alta o crítica sin corrección disponible en una dependencia del núcleo;
- el peso de la vista inicial supera el presupuesto de SYS-NFN-10 sin solución dentro de la pila.
