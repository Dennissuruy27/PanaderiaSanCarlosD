
package com.mycompany.proyectoweb.manager;

import com.mycompany.proyectoweb.config.ConexionOracle;

import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Types;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class RepartidoresManager {

    public List<Map<String, Object>> obtenerPedidosRepartidor(
            Long idRepartidor) throws Exception {

        if (idRepartidor == null || idRepartidor <= 0) {
            throw new IllegalArgumentException(
                    "El ID del repartidor no es valido.");
        }

        List<Map<String, Object>> pedidos = new ArrayList<>();

        String sql = "{call PKG_PEDIDOS.GET_PEDIDOS_REPARTIDOR(?, ?)}";

        try (Connection conexion = ConexionOracle.getConnection();
             CallableStatement procedimiento =
                     conexion.prepareCall(sql)) {

            procedimiento.setLong(1, idRepartidor);
            procedimiento.registerOutParameter(2, Types.REF_CURSOR);

            procedimiento.execute();

            try (ResultSet resultado =
                    (ResultSet) procedimiento.getObject(2)) {

                ResultSetMetaData metadata = resultado.getMetaData();
                int totalColumnas = metadata.getColumnCount();

                while (resultado.next()) {

                    Map<String, Object> pedido = new HashMap<>();

                    for (int i = 1; i <= totalColumnas; i++) {
                        String columna = metadata.getColumnLabel(i);

                        pedido.put(
                                columna.toLowerCase(),
                                resultado.getObject(i)
                        );
                    }

                    pedidos.add(pedido);
                }
            }
        }

        return pedidos;
    }
}
