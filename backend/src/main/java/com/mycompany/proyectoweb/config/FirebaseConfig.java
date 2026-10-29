
package com.mycompany.proyectoweb.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.cloud.FirestoreClient;

import java.io.FileInputStream;
import java.io.IOException;

public class FirebaseConfig {

    private static final String RUTA_CREDENCIALES =
            "/etc/secrets/firebase-service-account.json";

    public static synchronized Firestore getFirestore()
            throws IOException {

        if (FirebaseApp.getApps().isEmpty()) {

            try (FileInputStream archivo =
                    new FileInputStream(RUTA_CREDENCIALES)) {

                FirebaseOptions opciones = FirebaseOptions.builder()
                        .setCredentials(
                            GoogleCredentials.fromStream(archivo)
                        )
                        .build();

                FirebaseApp.initializeApp(opciones);
            }
        }

        return FirestoreClient.getFirestore();
    }
}
