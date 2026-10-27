
package com.mycompany.proyectoweb.manager;

import com.mycompany.proyectoweb.config.ConexionOracle;
import com.mycompany.proyectoweb.model.Pedido;
import com.mycompany.proyectoweb.model.PedidoRequest;
import com.mycompany.proyectoweb.model.PedidoDetalle;
import com.mycompany.proyectoweb.model.PedidoDetalleRequest;

import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Types;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class PedidoManager {

    // =========================================================
    // 1. OBTENER TODOS LOS PEDIDOS
    // =========================================================
    public List<Pedido> getPedidos() throws Exception {

        List<Pedido> pedidos = new ArrayList<>();

        String sql = "{call PKG_PEDIDOS.GET_PEDIDOS(?)}";

        try (Connection conexion = ConexionOracle.getConnection();
             CallableStatement stmt = conexion.prepareCall(sql)) {

            stmt.registerOutParameter(1, Types.REF_CURSOR);
            stmt.execute();

            try (ResultSet rs = (ResultSet) stmt.getObject(1)) {

                while (rs.next()) {
                    pedidos.add(mapearPedido(rs));
                }
            }
        }

        return pedidos;
    }

    // =========================================================
    // 2. OBTENER PEDIDO POR ID
    // =========================================================
    public Pedido getPedido(int idPedido) throws Exception {

        String sql = "{call PKG_PEDIDOS.GET_PEDIDO(?, ?)}";

        try (Connection conexion = ConexionOracle.getConnection();
             CallableStatement stmt = conexion.prepareCall(sql)) {

            stmt.setInt(1, idPedido);
            stmt.registerOutParameter(2, Types.REF_CURSOR);

            stmt.execute();

            try (ResultSet rs = (ResultSet) stmt.getObject(2)) {

                if (rs.next()) {
                    return mapearPedido(rs);
                }
            }
        }

        return null;
    }

    // =========================================================
    // 3. CREAR PEDIDO
    // =========================================================
    public Map<String, Object> crearPedido(
            PedidoRequest pedido) throws Exception {

        String sql =
                "{call PKG_PEDIDOS.INS_PEDIDO(?, ?, ?, ?, ?)}";

        try (Connection conexion = ConexionOracle.getConnection();
             CallableStatement stmt = conexion.prepareCall(sql)) {

            stmt.setInt(1, pedido.getIdSucursal());
            stmt.setInt(2, pedido.getIdUsuario());
            stmt.setString(3, pedido.getObservaciones());

            stmt.registerOutParameter(4, Types.NUMERIC);
            stmt.registerOutParameter(5, Types.VARCHAR);

            stmt.execute();

            return obtenerResultado(stmt, 4, 5);
        }
    }

    // =========================================================
    // 4. AGREGAR PRODUCTO AL PEDIDO
    // =========================================================
    public Map<String, Object> agregarDetallePedido(
            int idPedido,
            PedidoDetalleRequest detalle) throws Exception {

        String sql =
                "{call PKG_PEDIDOS.INS_DETALLE_PEDIDO(?, ?, ?, ?, ?)}";

        try (Connection conexion = ConexionOracle.getConnection();
             CallableStatement stmt = conexion.prepareCall(sql)) {

            stmt.setInt(1, idPedido);
            stmt.setInt(2, detalle.getIdProducto());
            stmt.setDouble(3, detalle.getCantidadDp());

            stmt.registerOutParameter(4, Types.NUMERIC);
            stmt.registerOutParameter(5, Types.VARCHAR);

            stmt.execute();

            return obtenerResultado(stmt, 4, 5);
        }
    }

    // =========================================================
    // 5. OBTENER DETALLES DE UN PEDIDO
    // =========================================================
    public List<PedidoDetalle> getDetallePedido(
            int idPedido) throws Exception {

        List<PedidoDetalle> detalles = new ArrayList<>();

        String sql =
                "{call PKG_PEDIDOS.GET_DETALLE_PEDIDO(?, ?)}";

        try (Connection conexion = ConexionOracle.getConnection();
             CallableStatement stmt = conexion.prepareCall(sql)) {

            stmt.setInt(1, idPedido);
            stmt.registerOutParameter(2, Types.REF_CURSOR);

            stmt.execute();

            try (ResultSet rs = (ResultSet) stmt.getObject(2)) {

                while (rs.next()) {

                    PedidoDetalle detalle = new PedidoDetalle();

                    detalle.setIdDetalle(
                            rs.getInt("ID_DETALLE"));

                    detalle.setIdPedido(
                            rs.getInt("ID_PEDIDO"));

                    detalle.setIdProducto(
                            rs.getInt("ID_PRODUCTO"));

                    detalle.setNombreProducto(
                            rs.getString("NOMBRE_PRODUCTO"));

                    detalle.setCantidadDp(
                            rs.getDouble("CANTIDAD_DP"));

                    detalle.setPrecioDp(
                            rs.getDouble("PRECIO_DP"));

                    detalle.setSubtotal(
                            rs.getDouble("SUBTOTAL"));

                    detalles.add(detalle);
                }
            }
        }

        return detalles;
    }

    // =========================================================
    // 6. OBTENER PEDIDOS POR SUCURSAL
    // =========================================================
    public List<Pedido> getPedidosSucursal(
            int idSucursal) throws Exception {

        List<Pedido> pedidos = new ArrayList<>();

        String sql =
                "{call PKG_PEDIDOS.GET_PEDIDOS_SUCURSAL(?, ?)}";

        try (Connection conexion = ConexionOracle.getConnection();
             CallableStatement stmt = conexion.prepareCall(sql)) {

            stmt.setInt(1, idSucursal);
            stmt.registerOutParameter(2, Types.REF_CURSOR);

            stmt.execute();

            try (ResultSet rs = (ResultSet) stmt.getObject(2)) {

                while (rs.next()) {
                    pedidos.add(mapearPedido(rs));
                }
            }
        }

        return pedidos;
    }

    // =========================================================
    // 7. APROBAR PEDIDO
    // =========================================================
    public Map<String, Object> aprobarPedido(
            int idPedido) throws Exception {

        return ejecutarAccionPedido(
                "APROBAR_PEDIDO",
                idPedido
        );
    }

    // =========================================================
    // 8. INICIAR PRODUCCION DEL PEDIDO
    // =========================================================
    public Map<String, Object> iniciarProduccionPedido(
            int idPedido) throws Exception {

        return ejecutarAccionPedido(
                "INICIAR_PRODUCCION_PEDIDO",
                idPedido
        );
    }

    // =========================================================
    // 9. PREPARAR PEDIDO
    // =========================================================
    public Map<String, Object> prepararPedido(
            int idPedido) throws Exception {

        return ejecutarAccionPedido(
                "PREPARAR_PEDIDO",
                idPedido
        );
    }

    // =========================================================
    // 10. DESPACHAR PEDIDO
    // =========================================================
    public Map<String, Object> despacharPedido(
            int idPedido) throws Exception {

        return ejecutarAccionPedido(
                "DESPACHAR_PEDIDO",
                idPedido
        );
    }

    // =========================================================
    // 11. ENTREGAR PEDIDO
    // =========================================================
    public Map<String, Object> entregarPedido(
            int idPedido) throws Exception {

        return ejecutarAccionPedido(
                "ENTREGAR_PEDIDO",
                idPedido
        );
    }

    // =========================================================
    // 12. CANCELAR PEDIDO
    // =========================================================
    public Map<String, Object> cancelarPedido(
            int idPedido) throws Exception {

        return ejecutarAccionPedido(
                "CANCELAR_PEDIDO",
                idPedido
        );
    }

    // =========================================================
    // 13. ELIMINAR PRODUCTO DEL PEDIDO
    // =========================================================
    public Map<String, Object> eliminarDetallePedido(
            int idDetalle) throws Exception {

        return ejecutarAccionPedido(
                "DEL_DETALLE_PEDIDO",
                idDetalle
        );
    }

    // =========================================================
    // 14. CONSULTAR DISPONIBILIDAD DEL PEDIDO
    //
    // CONSULTA EL INVENTARIO GENERAL DE FABRICA.
    //
    // RESULTADO POR PRODUCTO:
    // DISPONIBLE = EXISTENCIA SUFICIENTE
    // PRODUCIR   = FALTA EXISTENCIA
    // =========================================================
    public List<Map<String, Object>> getDisponibilidadPedido(
            int idPedido) throws Exception {

        List<Map<String, Object>> disponibilidad =
                new ArrayList<>();

        String sql =
                "{call PKG_PEDIDOS.GET_DISPONIBILIDAD_PEDIDO(?, ?)}";

        try (Connection conexion = ConexionOracle.getConnection();
             CallableStatement stmt = conexion.prepareCall(sql)) {

            stmt.setInt(1, idPedido);
            stmt.registerOutParameter(2, Types.REF_CURSOR);

            stmt.execute();

            try (ResultSet rs = (ResultSet) stmt.getObject(2)) {

                while (rs.next()) {

                    Map<String, Object> producto = new HashMap<>();

                    producto.put(
                            "idProducto",
                            rs.getInt("ID_PRODUCTO")
                    );

                    producto.put(
                            "nombreProducto",
                            rs.getString("NOMBRE_PRODUCTO")
                    );

                    producto.put(
                            "cantidadSolicitada",
                            rs.getDouble("CANTIDAD_SOLICITADA")
                    );

                    producto.put(
                            "existencia",
                            rs.getDouble("EXISTENCIA")
                    );

                    producto.put(
                            "cantidadFaltante",
                            rs.getDouble("CANTIDAD_FALTANTE")
                    );

                    producto.put(
                            "resultado",
                            rs.getString("RESULTADO")
                    );

                    disponibilidad.add(producto);
                }
            }
        }

        return disponibilidad;
    }

    // =========================================================
    // METODO PRIVADO: EJECUTAR ACCIONES DEL PAQUETE ORACLE
    // =========================================================
    private Map<String, Object> ejecutarAccionPedido(
            String procedimiento,
            int id) throws Exception {

        // SOLO SE PERMITEN PROCEDIMIENTOS CONOCIDOS
        switch (procedimiento) {

            case "APROBAR_PEDIDO":
            case "INICIAR_PRODUCCION_PEDIDO":
            case "PREPARAR_PEDIDO":
            case "DESPACHAR_PEDIDO":
            case "ENTREGAR_PEDIDO":
            case "CANCELAR_PEDIDO":
            case "DEL_DETALLE_PEDIDO":
                break;

            default:
                throw new IllegalArgumentException(
                        "Procedimiento no permitido."
                );
        }

        String sql = "{call PKG_PEDIDOS."
                + procedimiento + "(?, ?, ?)}";

        try (Connection conexion = ConexionOracle.getConnection();
             CallableStatement stmt = conexion.prepareCall(sql)) {

            stmt.setInt(1, id);

            stmt.registerOutParameter(2, Types.NUMERIC);
            stmt.registerOutParameter(3, Types.VARCHAR);

            stmt.execute();

            return obtenerResultado(stmt, 2, 3);
        }
    }

    // =========================================================
    // METODO PRIVADO: LEER RESPUESTA DE ORACLE
    // =========================================================
    private Map<String, Object> obtenerResultado(
            CallableStatement stmt,
            int posicionId,
            int posicionMensaje) throws Exception {

        Map<String, Object> resultado = new HashMap<>();

        resultado.put(
                "idSalida",
                stmt.getInt(posicionId)
        );

        resultado.put(
                "mensaje",
                stmt.getString(posicionMensaje)
        );

        return resultado;
    }

    // =========================================================
    // METODO PRIVADO: MAPEAR PEDIDO
    // =========================================================
    private Pedido mapearPedido(ResultSet rs) throws Exception {

        Pedido pedido = new Pedido();

        pedido.setIdPedido(
                rs.getInt("ID_PEDIDO"));

        pedido.setIdSucursal(
                rs.getInt("ID_SUCURSAL"));

        pedido.setNombreSucursal(
                rs.getString("NOMBRE_SUCURSAL"));

        pedido.setIdUsuario(
                rs.getInt("ID_USUARIO"));

        pedido.setNombreUsuario(
                rs.getString("NOMBRE_USUARIO"));

        pedido.setFecha(
                rs.getString("FECHA"));

        pedido.setEstado(
                rs.getString("ESTADO"));

        pedido.setObservaciones(
                rs.getString("OBSERVACIONES"));

        pedido.setTotal(
                rs.getDouble("TOTAL"));

        return pedido;
    }
}

