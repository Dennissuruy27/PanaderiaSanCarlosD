
package com.mycompany.proyectoweb.manager;

import java.util.Map;
import java.util.Locale;

public class ValidacionIncidenciasEntrega {

    private final IncidenciasManager incidenciasManager =
            new IncidenciasManager();

    public boolean tieneIncidenciaActiva(
            int idPedido,
            long idRepartidor
    ) throws Exception {

        if (idPedido <= 0 || idRepartidor <= 0) {
            throw new IllegalArgumentException(
                    "El pedido o el repartidor no es valido."
            );
        }

        Object resultado =
                incidenciasManager.listarPorRepartidor(
                        idRepartidor
                );

        if (!(resultado instanceof Iterable<?>)) {
            throw new IllegalStateException(
                    "No se pudo verificar el estado de las incidencias."
            );
        }

        for (Object elemento : (Iterable<?>) resultado) {

            if (!(elemento instanceof Map<?, ?>)) {
                throw new IllegalStateException(
                        "Se recibio una incidencia invalida."
                );
            }

            Map<?, ?> incidencia =
                    (Map<?, ?>) elemento;

            Object pedidoValor = obtenerCampo(
                    incidencia,
                    "idPedido",
                    "id_pedido",
                    "ID_PEDIDO"
            );

            if (pedidoValor == null) {
                throw new IllegalStateException(
                        "Una incidencia no tiene pedido asociado."
                );
            }

            long pedidoIncidencia;

            try {

                pedidoIncidencia =
                        Long.parseLong(
                                String.valueOf(pedidoValor).trim()
                        );

            } catch (NumberFormatException e) {

                if (pedidoValor instanceof Number) {
                    pedidoIncidencia =
                            ((Number) pedidoValor).longValue();
                } else {
                    throw new IllegalStateException(
                            "El pedido de una incidencia no es valido.",
                            e
                    );
                }
            }

            if (pedidoIncidencia != idPedido) {
                continue;
            }

            Object estadoValor = obtenerCampo(
                    incidencia,
                    "estado",
                    "ESTADO"
            );

            if (estadoValor == null) {
                return true;
            }

            String estado =
                    String.valueOf(estadoValor)
                            .trim()
                            .toUpperCase(Locale.ROOT)
                            .replace(' ', '_');

            if (!"RESUELTA".equals(estado)
                    && !"RECHAZADA".equals(estado)) {

                return true;
            }
        }

        return false;
    }

    private Object obtenerCampo(
            Map<?, ?> incidencia,
            String... nombres
    ) {

        for (String nombre : nombres) {

            Object valor = incidencia.get(nombre);

            if (valor != null) {
                return valor;
            }
        }

        return null;
    }
}
