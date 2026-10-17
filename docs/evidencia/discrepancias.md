# Discrepancias y reglas faltantes

Registro de diferencias entre la serie D1–D5, este repositorio y la realidad de la construcción (CLAUDE.md §1, §10 y §12). Cada entrada cita el documento y la sección exactos. Las que la serie ya registró como INC-nn solo se referencian.

| # | Fecha | Fuente | Discrepancia | Resolución | Estado |
|---|---|---|---|---|---|
| DIS-01 | 2026-10-17 | D2 SYS-NFN-03 (columna de módulo: capa 4); D3 V-01 (capa 2); D3 V-04 y D5 MD-05 (balanceador) | El límite de 120 peticiones por minuto se ubicaba en tres lugares distintos. | ADR-08: dos niveles, balanceador en producción y guard de la capa 2 con contador en PostgreSQL. | Resuelta |
| DIS-02 | 2026-10-17 | D5 MD-05, figura 13 | Los artefactos se rotulaban `abasteceni-app.jar` y `abasteceni-worker.jar`, un compromiso tecnológico que D3 §1.3 dejó fuera y que contradice ADR-07. | Rótulos neutrales en `docs/modelos/MD-05-despliegue.puml` y en la figura de D5. Registrado como INC-16 de D5. | Resuelta |
| DIS-03 | 2026-10-17 | D5 MD-01, figura 9 y Anexo A; D5 §2.8 | Las clases internas de los agregados llevaban el estereotipo «entidad», que no pertenece a los nueve del perfil del Anexo B. | Las entidades internas no llevan estereotipo; solo la raíz es referenciable (restricción R2). Registrado como INC-16 de D5. | Resuelta |
| DIS-04 | 2026-10-17 | D5 MD-01, figura 9; D5 §2.12.1 y Anexo B | «datoPersonal» se aplicaba a la clase CuentaComercial, aunque el perfil lo define sobre Property y §2.12.1 exige aplicarlo al atributo. | Aplicado a `razonSocial` y `ruc`. Registrado como INC-16 de D5. | Resuelta |
| DIS-05 | 2026-10-17 | D5 §2.12.1 | El texto declaraba diecisiete clases y la figura contiene dieciséis. | Texto corregido a dieciséis. Registrado como INC-16 de D5. | Resuelta |
| DIS-06 | 2026-10-17 | ADR-04; D2 SYS-FN-04 a 08 | Ningún documento fija la vida de la credencial de acceso ni la de la credencial de renovación. | Regla faltante: se pregunta al equipo antes de fijar un valor. | Abierta |
