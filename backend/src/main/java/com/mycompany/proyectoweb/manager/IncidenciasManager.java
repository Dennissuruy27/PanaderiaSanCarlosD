
package com.mycompany.proyectoweb.manager;

import com.mycompany.proyectoweb.config.FirebaseConfig;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.cloud.firestore.FieldValue;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

public class IncidenciasManager {

    private static final String COLECCION = "incidencias";

    public String registrarIncidencia(
            Long idPedido,
            Long idRepartidor,
            String tipoIncidencia,
            String descripcion) throws Exception {

        if (idPedido == null || idPedido <= 0) {
            throw new IllegalArgumentException("ID de pedido invalido.");
        }

        if (idRepartidor == null || idRepartidor <= 0) {
            throw new IllegalArgumentException("ID de repartidor invalido.");
        }

        if (tipoIncidencia == null || tipoIncidencia.trim().isEmpty()) {
            throw new IllegalArgumentException("El tipo de incidencia es obligatorio.");
        }

        if (descripcion == null || descripcion.trim().isEmpty()) {
            throw new IllegalArgumentException("La descripcion es obligatoria.");
        }

        Firestore db = FirebaseConfig.getFirestore();

        Map<String, Object> datos = new HashMap<>();
        datos.put("idPedido", idPedido);
        datos.put("idRepartidor", idRepartidor);
        datos.put("tipoIncidencia", tipoIncidencia.trim());
        datos.put("descripcion", descripcion.trim());
        datos.put("estado", "PENDIENTE");
        datos.put("fechaRegistro", FieldValue.serverTimestamp());

        DocumentReference documento = db.collection(COLECCION).document();

        documento.set(datos).get(15, TimeUnit.SECONDS);

        return documento.getId();
    }

    public List<Map<String, Object>> listarIncidencias() throws Exception {

        Firestore db = FirebaseConfig.getFirestore();

        QuerySnapshot resultado = db.collection(COLECCION)
                .get()
                .get(15, TimeUnit.SECONDS);

        List<Map<String, Object>> incidencias = new ArrayList<>();

        for (QueryDocumentSnapshot documento : resultado.getDocuments()) {
            Map<String, Object> datos = new HashMap<>(documento.getData());
            datos.put("idIncidencia", documento.getId());
            incidencias.add(datos);
        }

        return incidencias;
    }

    public List<Map<String, Object>> listarPorRepartidor(
            Long idRepartidor) throws Exception {

        if (idRepartidor == null || idRepartidor <= 0) {
            throw new IllegalArgumentException("ID de repartidor invalido.");
        }

        Firestore db = FirebaseConfig.getFirestore();

        QuerySnapshot resultado = db.collection(COLECCION)
                .whereEqualTo("idRepartidor", idRepartidor)
                .get()
                .get(15, TimeUnit.SECONDS);

        List<Map<String, Object>> incidencias = new ArrayList<>();

        for (QueryDocumentSnapshot documento : resultado.getDocuments()) {
            Map<String, Object> datos = new HashMap<>(documento.getData());
            datos.put("idIncidencia", documento.getId());
            incidencias.add(datos);
        }

        return incidencias;
    }

    public Map<String, Object> obtenerIncidencia(
            String idIncidencia) throws Exception {

        if (idIncidencia == null || idIncidencia.trim().isEmpty()) {
            throw new IllegalArgumentException("ID de incidencia obligatorio.");
        }

        Firestore db = FirebaseConfig.getFirestore();

        DocumentSnapshot documento = db.collection(COLECCION)
                .document(idIncidencia)
                .get()
                .get(15, TimeUnit.SECONDS);

        if (!documento.exists()) {
            return null;
        }

        Map<String, Object> datos = new HashMap<>(documento.getData());
        datos.put("idIncidencia", documento.getId());

        return datos;
    }
}
