-- Limpia movimientos de traslado inconsistentes (mismo origen/destino o sin destino)
DELETE l FROM linea_catalogo_items l
INNER JOIN movimientos m ON m.id = l.movimiento_id
WHERE m.tipo = 'SALIDA'
  AND m.referencia_tipo = 'TRASLADO'
  AND (
    m.almacen_destino_id IS NULL
    OR m.almacen_destino_id = m.almacen_id
  );

DELETE FROM movimientos
WHERE tipo = 'SALIDA'
  AND referencia_tipo = 'TRASLADO'
  AND (
    almacen_destino_id IS NULL
    OR almacen_destino_id = almacen_id
  );
