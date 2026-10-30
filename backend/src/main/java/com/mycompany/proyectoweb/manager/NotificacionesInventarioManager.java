
package com.mycompany.proyectoweb.manager;

import com.mycompany.proyectoweb.config.ConexionOracle;
import com.mycompany.proyectoweb.config.FirebaseConfig;
import com.mycompany.proyectoweb.model.ExistenciaBaja;

import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.FieldValue;
import com.google.cloud.firestore.QueryDocumentSnapshot;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.MessagingErrorCode;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import com.google.firebase.messaging.AndroidConfig;
import com.google.firebase.messaging.AndroidNotification;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class NotificacionesInventarioManager {

    private static final String COLECCION_DISPOSITIVOS =
            "dispositivos_notificaciones";

    private static final String COLECCION_ALERTAS =
            "estados_alertas_inventario";

    private static final String COLECCION_ENVIOS =
            "envios_alertas_inventario";

    private final InventarioManager inventario =
            new InventarioManager();

    private Firestore db() throws Exception {
        return FirebaseConfig.getFirestore();
    }

    // ==========================================
    // REGISTRAR DISPOSITIVO DEL ADMINISTRADOR
    // ==========================================

    public void registrarDispositivo(
            int idAdministrador,
            String token
    ) throws Exception {

        validarToken(token);

        Map<String, Object> datos = new HashMap<>();

        datos.put("idAdministrador", idAdministrador);
        datos.put("token", token);
        datos.put("activo", true);
        datos.put("actualizado", FieldValue.serverTimestamp());

        db().collection(COLECCION_DISPOSITIVOS)
                .document(hash(token))
                .set(datos)
                .get();
    }

    // ==========================================
    // REVOCAR DISPOSITIVOS DE UNA CUENTA
    // ==========================================

    public void revocarDispositivos(
            int idAdministrador
    ) throws Exception {

        for (QueryDocumentSnapshot documento :
                db().collection(COLECCION_DISPOSITIVOS)
                        .whereEqualTo(
                                "idAdministrador",
                                idAdministrador
                        )
                        .get()
                        .get()
                        .getDocuments()) {

            documento.getReference().delete().get();
        }
    }

    // ==========================================
    // REVISAR Y ENVIAR ALERTAS
    // ==========================================

    public Map<String, Object> procesarAlertas()
            throws Exception {

        Firestore firestore = db();

        Map<String, Alerta> alertasActuales =
                obtenerAlertasActuales();

        // Recuperar productos que ya no están bajos.
        for (QueryDocumentSnapshot documento :
                firestore.collection(COLECCION_ALERTAS)
                        .whereEqualTo("activa", true)
                        .get()
                        .get()
                        .getDocuments()) {

            if (!alertasActuales.containsKey(
                    documento.getId())) {

                documento.getReference()
                        .update(
                                "activa",
                                false,
                                "fechaRecuperacion",
                                FieldValue.serverTimestamp()
                        )
                        .get();
            }
        }

        Set<Integer> administradoresActivos =
                obtenerAdministradoresActivos();

        List<QueryDocumentSnapshot> dispositivos =
                firestore.collection(COLECCION_DISPOSITIVOS)
                        .get()
                        .get()
                        .getDocuments();

        int mensajesEnviados = 0;
        int erroresEnvio = 0;

        for (Alerta alerta : alertasActuales.values()) {

            String clave = alerta.clave;

            DocumentSnapshot estadoAnterior =
                    firestore.collection(COLECCION_ALERTAS)
                            .document(clave)
                            .get()
                            .get();

            boolean estabaActiva =
                    estadoAnterior.exists()
                            && Boolean.TRUE.equals(
                                    estadoAnterior.getBoolean("activa")
                            );

            long episodio = estadoAnterior.exists()
                    && estadoAnterior.getLong("episodio") != null
                    ? estadoAnterior.getLong("episodio")
                    : 0L;

            // Si el producto acaba de entrar nuevamente
            // en situación baja, empieza otro episodio.
            if (!estabaActiva) {
                episodio++;
            }

            Map<String, Object> datosEstado =
                    new HashMap<>();

            datosEstado.put("activa", true);
            datosEstado.put("episodio", episodio);
            datosEstado.put("nombreProducto", alerta.nombre);
            datosEstado.put("ubicacion", alerta.ubicacion);
            datosEstado.put("existencia", alerta.existencia);
            datosEstado.put("existenciaMinima", alerta.minima);
            datosEstado.put(
                    "ultimaRevision",
                    FieldValue.serverTimestamp()
            );

            firestore.collection(COLECCION_ALERTAS)
                    .document(clave)
                    .set(datosEstado)
                    .get();

            for (QueryDocumentSnapshot dispositivo :
                    dispositivos) {

                Long idAdministrador =
                        dispositivo.getLong("idAdministrador");

                if (idAdministrador == null
                        || !administradoresActivos.contains(
                                idAdministrador.intValue())) {
                    continue;
                }

                String token = dispositivo.getString("token");

                if (token == null || token.trim().isEmpty()) {
                    continue;
                }

                // Un envío por dispositivo y por episodio.
                String claveEnvio =
                        clave + "_" + episodio
                                + "_" + hash(token);

                DocumentSnapshot envioAnterior =
                        firestore.collection(COLECCION_ENVIOS)
                                .document(claveEnvio)
                                .get()
                                .get();

                if (envioAnterior.exists()) {
                    continue;
                }

                try {

                    enviarNotificacion(token, alerta);

                    Map<String, Object> envio =
                            new HashMap<>();

                    envio.put("claveAlerta", clave);
                    envio.put("episodio", episodio);
                    envio.put(
                            "idAdministrador",
                            idAdministrador
                    );
                    envio.put(
                            "fechaEnvio",
                            FieldValue.serverTimestamp()
                    );

                    firestore.collection(COLECCION_ENVIOS)
                            .document(claveEnvio)
                            .set(envio)
                            .get();

                    mensajesEnviados++;

                } catch (FirebaseMessagingException e) {

                    erroresEnvio++;

                    if (e.getMessagingErrorCode()
                            == MessagingErrorCode.UNREGISTERED) {

                        dispositivo.getReference()
                                .delete()
                                .get();
                    }

                    System.err.println(
                            "Fallo al enviar alerta "
                                    + clave + ": "
                                    + e.getMessage()
                    );
                }
            }
        }

        Map<String, Object> resultado = new HashMap<>();

        resultado.put("estado", "OK");
        resultado.put(
                "productosConExistenciaBaja",
                alertasActuales.size()
        );
        resultado.put(
                "notificacionesEnviadas",
                mensajesEnviados
        );
        resultado.put(
                "erroresEnvio",
                erroresEnvio
        );

        return resultado;
    }

    // ==========================================
    // OBTENER ALERTAS CENTRALES Y SUCURSALES
    // ==========================================

    private Map<String, Alerta> obtenerAlertasActuales()
            throws Exception {

        Map<String, Alerta> resultado =
                new LinkedHashMap<>();

        for (ExistenciaBaja producto :
                inventario.getExistenciasBajas()) {

            Alerta alerta = new Alerta();

            alerta.clave =
                    "CENTRAL_" + producto.getIdProducto();

            alerta.ubicacion = "Central";
            alerta.nombre = producto.getNombreProducto();
            alerta.existencia = producto.getExistencia();
            alerta.minima = producto.getExistenciaMinima();
            alerta.unidad = producto.getUnidadMedida();

            resultado.put(alerta.clave, alerta);
        }

        for (Integer idSucursal :
                obtenerSucursalesActivas()) {

            List<Map<String, Object>> productos =
                    inventario.getExistenciasBajasSucursal(
                            idSucursal
                    );

            for (Map<String, Object> producto : productos) {

                int idProducto = ((Number)
                        producto.get("idProducto")).intValue();

                Alerta alerta = new Alerta();

                alerta.clave =
                        "SUC_" + idSucursal + "_" + idProducto;

                alerta.ubicacion = String.valueOf(
                        producto.get("nombreSucursal")
                );

                alerta.nombre = String.valueOf(
                        producto.get("nombreProducto")
                );

                alerta.existencia = ((Number)
                        producto.get("existencia")).doubleValue();

                alerta.minima = ((Number)
                        producto.get("existenciaMinima")).doubleValue();

                alerta.unidad = String.valueOf(
                        producto.get("unidadMedida")
                );

                resultado.put(alerta.clave, alerta);
            }
        }

        return resultado;
    }

    // ==========================================
    // CONSULTAR SUCURSALES ACTIVAS
    // ==========================================

    private List<Integer> obtenerSucursalesActivas()
            throws Exception {

        List<Integer> sucursales = new ArrayList<>();

        String sql =
                "SELECT ID_SUCURSAL FROM SUCURSAL "
                        + "WHERE ACTIVO = 1";

        try (Connection conexion =
                     ConexionOracle.getConnection();
             PreparedStatement stmt =
                     conexion.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {

            while (rs.next()) {
                sucursales.add(rs.getInt("ID_SUCURSAL"));
            }
        }

        return sucursales;
    }

    // ==========================================
    // VALIDAR ADMINISTRADORES ACTIVOS
    // ==========================================

    private Set<Integer> obtenerAdministradoresActivos()
            throws Exception {

        Set<Integer> ids = new HashSet<>();

        String sql =
                "SELECT ID_USUARIO FROM USUARIO "
                        + "WHERE UPPER(TRIM(ROL)) = 'ADMIN' "
                        + "AND ACTIVO = 1";

        try (Connection conexion =
                     ConexionOracle.getConnection();
             PreparedStatement stmt =
                     conexion.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {

            while (rs.next()) {
                ids.add(rs.getInt("ID_USUARIO"));
            }
        }

        return ids;
    }

    // ==========================================
    // ENVIAR MENSAJE PUSH
    // ==========================================

    private void enviarNotificacion(
            String token,
            Alerta alerta
    ) throws FirebaseMessagingException {

        String titulo =
                "Inventario bajo - " + alerta.ubicacion;

        String cuerpo =
                alerta.nombre
                        + ": quedan "
                        + alerta.existencia
                        + " " + alerta.unidad
                        + ". Mínimo: "
                        + alerta.minima
                        + ".";

        Message mensaje = Message.builder()
                .setToken(token)
                .setNotification(
                        Notification.builder()
                                .setTitle(titulo)
                                .setBody(cuerpo)
                                .build()
                )
                .setAndroidConfig(
                        AndroidConfig.builder()
                                .setPriority(
                                        AndroidConfig.Priority.HIGH
                                )
                                .setNotification(
                                        AndroidNotification.builder()
                                                .setChannelId(
                                                        "alertas_inventario"
                                                )
                                                .build()
                                )
                                .build()
                )
                .build();

        FirebaseMessaging.getInstance().send(mensaje);
    }

    // ==========================================
    // VALIDAR TOKEN
    // ==========================================

    private void validarToken(String token) {

        if (token == null
                || token.length() < 20
                || token.length() > 4096
                || token.matches(".*\\s+.*")) {

            throw new IllegalArgumentException(
                    "El dispositivo no es válido."
            );
        }
    }

    // ==========================================
    // GENERAR IDENTIFICADOR DE TOKEN
    // ==========================================

    private String hash(String valor) throws Exception {

        byte[] bytes =
                MessageDigest.getInstance("SHA-256")
                        .digest(
                                valor.getBytes(
                                        StandardCharsets.UTF_8
                                )
                        );

        StringBuilder resultado = new StringBuilder();

        for (byte b : bytes) {
            resultado.append(
                    String.format("%02x", b & 0xff)
            );
        }

        return resultado.toString();
    }

    private static class Alerta {

        String clave;
        String ubicacion;
        String nombre;
        String unidad;

        double existencia;
        double minima;
    }
}
