-- Privilegios explícitos de abasteceni_app sobre la tabla de SYS-FN-05 (ADR-05).
-- La API inserta la solicitud, la anula al llegar otra y la marca usada; no se borra.
GRANT SELECT, INSERT, UPDATE ON m2_seguridad.recuperaciones TO abasteceni_app;
