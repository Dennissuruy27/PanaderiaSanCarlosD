package com.mycompany.proyectoweb.manager;

import com.mycompany.proyectoweb.config.ConexionOracle;
import com.mycompany.proyectoweb.model.Receta;
import com.mycompany.proyectoweb.model.RecetaDetalle;
import com.mycompany.proyectoweb.model.RecetaRequest;
import com.mycompany.proyectoweb.model.RecetaDetalleRequest;
import com.mycompany.proyectoweb.model.RecetaUpdateRequest;

import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Types;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import oracle.jdbc.OracleTypes;

public class RecetaManager {

    // Método auxiliar para procesar resultados de Oracle.
    private Map<String, Object> ejecutarOperacion(
            String sql,
            Object[] parametros,
            String campoId
    ) throws Exception {

        Map<String, Object> resultado = new HashMap<>();

        try (
            Connection conexion = ConexionOracle.getConnection();
            CallableStatement stmt = conexion.prepareCall(sql)
        ) {
            int posicion = 1;

            for (Object parametro : parametros) {
                if (parametro instanceof Integer) {
                    stmt.setInt(posicion, (Integer) parametro);
                } else if (parametro instanceof Double) {
                    stmt.setDouble(posicion, (Double) parametro);
                } else if (parametro instanceof String) {
                    stmt.setString(posicion, (String) parametro);
                } else {
                    stmt.setObject(posicion, parametro);
                }
                posicion++;
            }

            stmt.registerOutParameter(posicion, Types.NUMERIC);
            stmt.registerOutParameter(posicion + 1, Types.VARCHAR);

            stmt.execute();

            resultado.put(campoId, stmt.getInt(posicion));
            resultado.put("mensaje", stmt.getString(posicion + 1));
        }

        return resultado;
    }

    // =====================================================
    // 1. CONSULTAR RECETAS ACTIVAS
    // =====================================================

    public List<Receta> getRecetas() throws Exception {

        List<Receta> recetas = new ArrayList<>();

        String sql = "{call PKG_RECETAS.GET_RECETAS(?)}";

        try (
            Connection conexion = ConexionOracle.getConnection();
            CallableStatement stmt = conexion.prepareCall(sql)
        ) {
            stmt.registerOutParameter(1, OracleTypes.CURSOR);
            stmt.execute();

            try (ResultSet rs = (ResultSet) stmt.getObject(1)) {
                while (rs.next()) {
                    recetas.add(mapearReceta(rs));
                }
            }
        }

        return recetas;
    }

    // =====================================================
    // 2. CONSULTAR TODAS LAS RECETAS
    // =====================================================

    public List<Receta> getTodasRecetas() throws Exception {

        List<Receta> recetas = new ArrayList<>();

        String sql = "{call PKG_RECETAS.GET_TODAS_RECETAS(?)}";

        try (
            Connection conexion = ConexionOracle.getConnection();
            CallableStatement stmt = conexion.prepareCall(sql)
        ) {
            stmt.registerOutParameter(1, OracleTypes.CURSOR);
            stmt.execute();

            try (ResultSet rs = (ResultSet) stmt.getObject(1)) {
                while (rs.next()) {
                    recetas.add(mapearReceta(rs));
                }
            }
        }

        return recetas;
    }

    // =====================================================
    // 3. CONSULTAR RECETA POR ID
    // =====================================================

    public Receta getReceta(int idReceta) throws Exception {

        String sql = "{call PKG_RECETAS.GET_RECETA(?, ?)}";

        try (
            Connection conexion = ConexionOracle.getConnection();
            CallableStatement stmt = conexion.prepareCall(sql)
        ) {
            stmt.setInt(1, idReceta);
            stmt.registerOutParameter(2, OracleTypes.CURSOR);
            stmt.execute();

            try (ResultSet rs = (ResultSet) stmt.getObject(2)) {
                if (rs.next()) {
                    return mapearReceta(rs);
                }
            }
        }

        return null;
    }

    // =====================================================
    // 4. CONSULTAR INGREDIENTES
    // =====================================================

    public List<RecetaDetalle> getDetalleReceta(
            int idReceta
    ) throws Exception {

        List<RecetaDetalle> detalles = new ArrayList<>();

        String sql =
                "{call PKG_RECETAS.GET_DETALLE_RECETA(?, ?)}";

        try (
            Connection conexion = ConexionOracle.getConnection();
            CallableStatement stmt = conexion.prepareCall(sql)
        ) {
            stmt.setInt(1, idReceta);
            stmt.registerOutParameter(2, OracleTypes.CURSOR);
            stmt.execute();

            try (ResultSet rs = (ResultSet) stmt.getObject(2)) {
                while (rs.next()) {
                    detalles.add(mapearDetalleReceta(rs));
                }
            }
        }

        return detalles;
    }

    // =====================================================
    // 5. INSERTAR RECETA ORIGINAL
    // =====================================================

    public Map<String, Object> insertarReceta(
            RecetaRequest receta
    ) throws Exception {

        return ejecutarOperacion(
                "{call PKG_RECETAS.INS_RECETA(?, ?, ?, ?, ?)}",
                new Object[]{
                    receta.getIdProducto(),
                    receta.getNombreReceta(),
                    receta.getRendimiento()
                },
                "idReceta"
        );
    }

    // =====================================================
    // 6. INSERTAR PROPUESTA
    // =====================================================

    public Map<String, Object> insertarRecetaPropuesta(
            RecetaRequest receta,
            int idUsuarioCreador
    ) throws Exception {

        return ejecutarOperacion(
                "{call PKG_RECETAS.INS_RECETA_PROPUESTA(?, ?, ?, ?, ?, ?)}",
                new Object[]{
                    receta.getIdProducto(),
                    receta.getNombreReceta(),
                    receta.getRendimiento(),
                    idUsuarioCreador
                },
                "idReceta"
        );
    }

    // =====================================================
    // 7. ACTUALIZAR RECETA
    // =====================================================

    public Map<String, Object> actualizarReceta(
            int idReceta,
            RecetaUpdateRequest receta
    ) throws Exception {

        return actualizarReceta(idReceta, receta, false);
    }

    public Map<String, Object> actualizarReceta(
            int idReceta,
            RecetaUpdateRequest receta,
            boolean autorizadoAdmin
    ) throws Exception {

        Receta actual = getReceta(idReceta);

        if (actual == null) {
            Map<String, Object> resultado = new HashMap<>();
            resultado.put("idSalida", -1);
            resultado.put("mensaje", "La receta no existe.");
            return resultado;
        }

        return ejecutarOperacion(
                "{call PKG_RECETAS.UPD_RECETA(?, ?, ?, ?, ?, ?, ?)}",
                new Object[]{
                    idReceta,
                    actual.getIdProducto(),
                    receta.getNombreReceta(),
                    receta.getRendimiento()
                },
                "idSalida",
                autorizadoAdmin
        );
    }

    // =====================================================
    // 8. DESACTIVAR RECETA
    // =====================================================

    public Map<String, Object> eliminarReceta(
            int idReceta
    ) throws Exception {

        return ejecutarOperacion(
                "{call PKG_RECETAS.DEL_RECETA(?, ?, ?)}",
                new Object[]{idReceta},
                "idSalida"
        );
    }

    // =====================================================
    // 9. REACTIVAR RECETA
    // =====================================================

    public Map<String, Object> reactivarReceta(
            int idReceta
    ) throws Exception {

        return ejecutarOperacion(
                "{call PKG_RECETAS.REACTIVAR_RECETA(?, ?, ?)}",
                new Object[]{idReceta},
                "idSalida"
        );
    }

    // =====================================================
    // 10. APROBAR RECETA
    // =====================================================

    public Map<String, Object> aprobarReceta(
            int idReceta
    ) throws Exception {

        return ejecutarOperacion(
                "{call PKG_RECETAS.APROBAR_RECETA(?, ?, ?)}",
                new Object[]{idReceta},
                "idSalida"
        );
    }

    // =====================================================
    // 11. AGREGAR INGREDIENTE
    // =====================================================

    public Map<String, Object> insertarDetalleReceta(
            int idReceta,
            RecetaDetalleRequest detalle
    ) throws Exception {

        return insertarDetalleReceta(idReceta, detalle, false);
    }

    public Map<String, Object> insertarDetalleReceta(
            int idReceta,
            RecetaDetalleRequest detalle,
            boolean autorizadoAdmin
    ) throws Exception {

        return ejecutarOperacion(
                "{call PKG_RECETAS.INS_DETALLE_RECETA(?, ?, ?, ?, ?, ?)}",
                new Object[]{
                    idReceta,
                    detalle.getIdProducto(),
                    detalle.getCantidadD()
                },
                "idDetalle",
                autorizadoAdmin
        );
    }

    // =====================================================
    // 12. ELIMINAR INGREDIENTE
    // =====================================================

    public Map<String, Object> eliminarDetalleReceta(
            int idDetalle
    ) throws Exception {

        return eliminarDetalleReceta(idDetalle, false);
    }

    public Map<String, Object> eliminarDetalleReceta(
            int idDetalle,
            boolean autorizadoAdmin
    ) throws Exception {

        return ejecutarOperacion(
                "{call PKG_RECETAS.DEL_DETALLE_RECETA(?, ?, ?, ?)}",
                new Object[]{idDetalle},
                "idSalida",
                autorizadoAdmin
        );
    }

    // =====================================================
    // 13. ACTUALIZAR CANTIDAD DE INGREDIENTE
    // =====================================================

    public Map<String, Object> actualizarCantidadIngrediente(
            int idDetalle,
            double cantidad,
            boolean autorizadoAdmin
    ) throws Exception {

        return ejecutarOperacion(
                "{call PKG_RECETAS.UPD_DETALLE_RECETA(?, ?, ?, ?, ?)}",
                new Object[]{idDetalle, cantidad},
                "idSalida",
                autorizadoAdmin
        );
    }

    // =====================================================
    // AUXILIAR PARA OPERACIONES CON P_ES_ADMIN
    //
    // Orden de parámetros Oracle:
    // Entradas, ID_SALIDA, MENSAJE, ES_ADMIN.
    // =====================================================

    private Map<String, Object> ejecutarOperacion(
            String sql,
            Object[] parametros,
            String campoId,
            boolean autorizadoAdmin
    ) throws Exception {

        Map<String, Object> resultado = new HashMap<>();

        try (
            Connection conexion = ConexionOracle.getConnection();
            CallableStatement stmt = conexion.prepareCall(sql)
        ) {
            int posicion = 1;

            for (Object parametro : parametros) {

                if (parametro instanceof Integer) {
                    stmt.setInt(posicion, (Integer) parametro);
                } else if (parametro instanceof Double) {
                    stmt.setDouble(posicion, (Double) parametro);
                } else if (parametro instanceof String) {
                    stmt.setString(posicion, (String) parametro);
                } else {
                    stmt.setObject(posicion, parametro);
                }

                posicion++;
            }

            int posicionId = posicion;
            int posicionMensaje = posicion + 1;
            int posicionAdmin = posicion + 2;

            stmt.registerOutParameter(
                    posicionId,
                    Types.NUMERIC
            );

            stmt.registerOutParameter(
                    posicionMensaje,
                    Types.VARCHAR
            );

            stmt.setInt(
                    posicionAdmin,
                    autorizadoAdmin ? 1 : 0
            );

            stmt.execute();

            resultado.put(
                    campoId,
                    stmt.getInt(posicionId)
            );

            resultado.put(
                    "mensaje",
                    stmt.getString(posicionMensaje)
            );
        }

        return resultado;
    }

    // =====================================================
    // MAPEAR RECETA
    // =====================================================

    private Receta mapearReceta(ResultSet rs)
            throws Exception {

        Receta receta = new Receta();

        receta.setIdReceta(rs.getInt("ID_RECETA"));
        receta.setIdProducto(rs.getInt("ID_PRODUCTO"));

        receta.setNombreProducto(
                rs.getString("NOMBRE_PRODUCTO")
        );

        receta.setNombreReceta(
                rs.getString("NOMBRE_RECETA")
        );

        receta.setRendimiento(
                rs.getDouble("RENDIMIENTO")
        );

        receta.setActivo(rs.getInt("ACTIVO"));

        receta.setFechaCreacion(
                rs.getString("FECHA_CREACION")
        );

        receta.setAprobado(
                rs.getInt("APROBADO")
        );

        int idCreador =
                rs.getInt("ID_USUARIO_CREADOR");

        receta.setIdUsuarioCreador(
                rs.wasNull() ? null : idCreador
        );

        return receta;
    }

    // =====================================================
    // MAPEAR INGREDIENTE
    // =====================================================

    private RecetaDetalle mapearDetalleReceta(
            ResultSet rs
    ) throws Exception {

        RecetaDetalle detalle = new RecetaDetalle();

        detalle.setIdDetalle(rs.getInt("ID_DETALLE"));
        detalle.setIdReceta(rs.getInt("ID_RECETA"));
        detalle.setIdProducto(rs.getInt("ID_PRODUCTO"));

        detalle.setNombreProducto(
                rs.getString("NOMBRE_PRODUCTO")
        );

        detalle.setUnidadMedida(
                rs.getString("UNIDAD_MEDIDA")
        );

        detalle.setCantidadD(
                rs.getDouble("CANTIDAD_D")
        );

        return detalle;
    }
}


