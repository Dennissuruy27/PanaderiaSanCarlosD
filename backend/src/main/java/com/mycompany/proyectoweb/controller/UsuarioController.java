
package com.mycompany.proyectoweb.controller;

import com.mycompany.proyectoweb.manager.UsuarioManager;
import com.mycompany.proyectoweb.model.LoginRequest;
import com.mycompany.proyectoweb.model.Usuario;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;

import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

@Path("usuarios")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class UsuarioController {

    private final UsuarioManager manager = new UsuarioManager();

    @Context
    private HttpServletRequest httpRequest;

    // ============================================
    // 1. INICIAR SESION
    // POST /api/usuarios/login
    // ============================================

    @POST
    @Path("login")
    public Response login(LoginRequest request) {

        if (request == null
                || request.getUsuario() == null
                || request.getUsuario().isBlank()
                || request.getClave() == null
                || request.getClave().isBlank()) {

            return error(400,
                    "Debe ingresar usuario y clave.");
        }

        try {

            Usuario usuario = manager.login(
                    request.getUsuario(),
                    request.getClave()
            );

            if (usuario == null) {
                return error(401,
                        "Usuario o clave incorrectos.");
            }

            HttpSession anterior =
                    httpRequest.getSession(false);

            if (anterior != null) {
                anterior.invalidate();
            }

            HttpSession sesion =
                    httpRequest.getSession(true);

            sesion.setAttribute(
                    "idUsuario",
                    usuario.getIdUsuario()
            );

            sesion.setAttribute(
                    "rol",
                    usuario.getRol()
            );

            sesion.setAttribute(
                    "idSucursal",
                    usuario.getIdSucursal()
            );

            sesion.setAttribute(
                    "nombreUsuario",
                    usuario.getNombreUsuario()
            );

            sesion.setAttribute(
                    "usuario",
                    usuario.getUsuario()
            );

            sesion.setMaxInactiveInterval(30 * 60);

            Map<String, Object> respuesta =
                    new HashMap<>();

            respuesta.put("estado", "OK");
            respuesta.put("mensaje", "Login correcto.");
            respuesta.put("usuario", usuario);

            return Response.ok(respuesta).build();

        } catch (Exception e) {

            e.printStackTrace();

            return error(500,
                    "Error interno al realizar el login.");
        }
    }

    // ============================================
    // 2. CERRAR SESION
    // POST /api/usuarios/logout
    // ============================================

    @POST
    @Path("logout")
    public Response cerrarSesion() {

        HttpSession sesion =
                httpRequest.getSession(false);

        if (sesion != null) {
            sesion.invalidate();
        }

        Map<String, Object> respuesta =
                new HashMap<>();

        respuesta.put("estado", "OK");
        respuesta.put(
                "mensaje",
                "Sesion cerrada correctamente."
        );

        return Response.ok(respuesta).build();
    }

    // ============================================
    // 3. VALIDAR SESION Y PERMISOS
    // ============================================

    private Response validarAccesoUsuarios() {

        HttpSession sesion =
                httpRequest.getSession(false);

        if (sesion == null
                || sesion.getAttribute("idUsuario") == null) {

            return error(401,
                    "Debe iniciar sesion.");
        }

        String rol = rolSesion();

        if (!"ADMIN".equals(rol)
                && !"SUCURSAL".equals(rol)) {

            return error(403,
                    "No tiene permisos para administrar usuarios.");
        }

        if ("SUCURSAL".equals(rol)
                && sucursalSesion() == null) {

            return error(403,
                    "Su cuenta no tiene una sucursal asignada.");
        }

        return null;
    }

    private String rolSesion() {

        HttpSession sesion =
                httpRequest.getSession(false);

        if (sesion == null) {
            return "";
        }

        Object rol = sesion.getAttribute("rol");

        return rol == null
                ? ""
                : rol.toString().trim().toUpperCase();
    }

    private Integer sucursalSesion() {

        HttpSession sesion =
                httpRequest.getSession(false);

        if (sesion == null) {
            return null;
        }

        Object valor =
                sesion.getAttribute("idSucursal");

        if (valor == null) {
            return null;
        }

        try {
            return Integer.valueOf(valor.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Integer idUsuarioSesion() {

        HttpSession sesion =
                httpRequest.getSession(false);

        if (sesion == null) {
            return null;
        }

        Object valor =
                sesion.getAttribute("idUsuario");

        if (valor == null) {
            return null;
        }

        try {
            return Integer.valueOf(valor.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private boolean esAdministrador() {
        return "ADMIN".equals(rolSesion());
    }

    private boolean rolValido(String rol) {

        if (rol == null) {
            return false;
        }

        switch (rol.trim().toUpperCase()) {

            case "ADMIN":
            case "SUCURSAL":
            case "VENDEDOR":
            case "REPARTIDOR":
                return true;

            default:
                return false;
        }
    }

    // ============================================
    // 4. VALIDAR ACCESO A UN USUARIO
    // ============================================

    private boolean puedeAdministrar(Usuario usuario) {

        if (usuario == null) {
            return false;
        }

        if (esAdministrador()) {
            return true;
        }

        if (!"SUCURSAL".equals(rolSesion())) {
            return false;
        }

        Integer miSucursal = sucursalSesion();
        Integer sucursalUsuario =
                usuario.getIdSucursal();

        if (miSucursal == null
                || sucursalUsuario == null) {
            return false;
        }

        return "VENDEDOR".equalsIgnoreCase(
                    usuario.getRol()
                )
                && miSucursal.equals(sucursalUsuario);
    }

    private Response validarUsuarioObjetivo(
            Usuario usuario) {

        if (usuario == null) {
            return error(404,
                    "Usuario no encontrado.");
        }

        if (!puedeAdministrar(usuario)) {
            return error(403,
                    "No tiene permisos sobre este usuario.");
        }

        return null;
    }

    // ============================================
    // 5. FILTRAR USUARIOS POR PERMISOS
    // ============================================

    private List<Usuario> filtrarUsuarios(
            List<Usuario> usuarios) {

        if (esAdministrador()) {
            return usuarios;
        }

        List<Usuario> filtrados =
                new ArrayList<>();

        for (Usuario usuario : usuarios) {

            if (puedeAdministrar(usuario)) {
                filtrados.add(usuario);
            }
        }

        return filtrados;
    }

    // ============================================
    // 6. CONSULTAR USUARIOS ACTIVOS
    // GET /api/usuarios
    // ============================================

    @GET
    public Response getUsuarios() {

        Response acceso = validarAccesoUsuarios();

        if (acceso != null) {
            return acceso;
        }

        try {

            List<Usuario> usuarios =
                    filtrarUsuarios(
                            manager.getUsuarios()
                    );

            return respuestaUsuarios(usuarios);

        } catch (Exception e) {

            e.printStackTrace();

            return error(500,
                    "Error al consultar usuarios.");
        }
    }

    // ============================================
    // 7. CONSULTAR TODOS LOS USUARIOS
    // GET /api/usuarios/todos
    // ============================================

    @GET
    @Path("todos")
    public Response getTodosUsuarios() {

        Response acceso = validarAccesoUsuarios();

        if (acceso != null) {
            return acceso;
        }

        try {

            List<Usuario> usuarios =
                    filtrarUsuarios(
                            manager.getTodosUsuarios()
                    );

            return respuestaUsuarios(usuarios);

        } catch (Exception e) {

            e.printStackTrace();

            return error(500,
                    "Error al consultar todos los usuarios.");
        }
    }

    // ============================================
    // 8. CONSULTAR USUARIO POR ID
    // GET /api/usuarios/{id}
    // ============================================

    @GET
    @Path("{id}")
    public Response getUsuario(
            @PathParam("id") int id) {

        Response acceso = validarAccesoUsuarios();

        if (acceso != null) {
            return acceso;
        }

        if (id <= 0) {
            return error(400, "ID no valido.");
        }

        try {

            Usuario usuario = manager.getUsuario(id);

            Response permiso =
                    validarUsuarioObjetivo(usuario);

            if (permiso != null) {
                return permiso;
            }

            Map<String, Object> respuesta =
                    new HashMap<>();

            respuesta.put("estado", "OK");
            respuesta.put("usuario", usuario);

            return Response.ok(respuesta).build();

        } catch (Exception e) {

            e.printStackTrace();

            return error(500,
                    "Error al consultar el usuario.");
        }
    }

    // ============================================
    // 9. REGISTRAR USUARIO
    // POST /api/usuarios
    // ============================================

    @POST
    public Response registrarUsuario(
            Map<String, Object> datos) {

        Response acceso = validarAccesoUsuarios();

        if (acceso != null) {
            return acceso;
        }

        if (datos == null) {
            return error(400,
                    "Debe proporcionar los datos del usuario.");
        }

        try {

            String nombre =
                    obtenerTexto(datos, "nombreUsuario");

            String usuario =
                    obtenerTexto(datos, "usuario");

            String clave =
                    obtenerTexto(datos, "clave");

            String rol =
                    obtenerTexto(datos, "rol");

            Integer idSucursal =
                    obtenerEnteroOpcional(
                            datos, "idSucursal"
                    );

            if (nombre == null || nombre.isBlank()
                    || usuario == null || usuario.isBlank()
                    || clave == null || clave.isBlank()
                    || !rolValido(rol)) {

                return error(400,
                        "Nombre, usuario, clave y rol valido son obligatorios.");
            }

            rol = rol.toUpperCase();

            if (nombre.length() > 100
                    || usuario.length() > 50
                    || clave.length() > 255) {

                return error(400,
                        "Uno de los campos supera la longitud permitida.");
            }

            // ENCARGADO SOLO REGISTRA VENDEDORES
            // DE SU PROPIA SUCURSAL

            if (!esAdministrador()) {

                if (!"VENDEDOR".equals(rol)) {

                    return error(403,
                            "Solo puede registrar vendedores.");
                }

                Integer miSucursal = sucursalSesion();

                if (miSucursal == null) {

                    return error(403,
                            "No tiene una sucursal asignada.");
                }

                // NO CONFIAR EN LA SUCURSAL ENVIADA
                // POR EL FRONTEND

                if (idSucursal != null
                        && !miSucursal.equals(idSucursal)) {

                    return error(403,
                            "No puede registrar usuarios en otra sucursal.");
                }

                idSucursal = miSucursal;
            }

            if (("SUCURSAL".equals(rol)
                    || "VENDEDOR".equals(rol))
                    && idSucursal == null) {

                return error(400,
                        "Este usuario debe tener una sucursal asignada.");
            }

            Map<String, Object> resultado =
                    manager.insertarUsuario(
                            nombre,
                            usuario,
                            clave,
                            rol,
                            idSucursal
                    );

            return responderOperacion(resultado);

        } catch (IllegalArgumentException e) {

            return error(400, e.getMessage());

        } catch (Exception e) {

            e.printStackTrace();

            return error(500,
                    "Error interno al registrar usuario.");
        }
    }

    // ============================================
    // 10. ACTUALIZAR USUARIO
    // PUT /api/usuarios/{id}
    // ============================================

    @PUT
    @Path("{id}")
    public Response actualizarUsuario(
            @PathParam("id") int id,
            Map<String, Object> datos) {

        Response acceso = validarAccesoUsuarios();

        if (acceso != null) {
            return acceso;
        }

        if (id <= 0 || datos == null) {

            return error(400,
                    "Datos de usuario no validos.");
        }

        try {

            Usuario actual = manager.getUsuario(id);

            Response permiso =
                    validarUsuarioObjetivo(actual);

            if (permiso != null) {
                return permiso;
            }

            String nombre =
                    obtenerTexto(datos, "nombreUsuario");

            String usuario =
                    obtenerTexto(datos, "usuario");

            String rol =
                    obtenerTexto(datos, "rol");

            Integer idSucursal =
                    obtenerEnteroOpcional(
                            datos, "idSucursal"
                    );

            if (nombre == null || nombre.isBlank()
                    || usuario == null || usuario.isBlank()
                    || !rolValido(rol)) {

                return error(400,
                        "Nombre, usuario y rol valido son obligatorios.");
            }

            rol = rol.toUpperCase();

            if (nombre.length() > 100
                    || usuario.length() > 50) {

                return error(400,
                        "Nombre o usuario supera la longitud permitida.");
            }

            if (!esAdministrador()) {

                if (!"VENDEDOR".equals(rol)) {

                    return error(403,
                            "No puede asignar este rol.");
                }

                Integer miSucursal = sucursalSesion();

                if (idSucursal != null
                        && !miSucursal.equals(idSucursal)) {

                    return error(403,
                            "No puede trasladar usuarios a otra sucursal.");
                }

                idSucursal = miSucursal;
            }

            if (("SUCURSAL".equals(rol)
                    || "VENDEDOR".equals(rol))
                    && idSucursal == null) {

                return error(400,
                        "Debe seleccionar una sucursal.");
            }

            // EVITAR QUE EL ADMIN CAMBIE SU
            // PROPIO ROL O SUCURSAL

            Integer idActual = idUsuarioSesion();

            if (esAdministrador()
                    && idActual != null
                    && idActual == id) {

                if (!"ADMIN".equals(rol)) {

                    return error(403,
                            "No puede quitarse su propio rol de administrador.");
                }

                Integer sucursalAnterior =
                        actual.getIdSucursal();

                if (sucursalAnterior == null
                        ? idSucursal != null
                        : !sucursalAnterior.equals(idSucursal)) {

                    return error(403,
                            "No puede cambiar su propia sucursal.");
                }
            }

            Map<String, Object> resultado =
                    manager.actualizarUsuario(
                            id,
                            nombre,
                            usuario,
                            rol,
                            idSucursal
                    );

            return responderOperacion(resultado);

        } catch (IllegalArgumentException e) {

            return error(400, e.getMessage());

        } catch (Exception e) {

            e.printStackTrace();

            return error(500,
                    "Error interno al actualizar usuario.");
        }
    }

    // ============================================
    // 11. DESACTIVAR USUARIO
    // DELETE /api/usuarios/{id}
    // ============================================

    @DELETE
    @Path("{id}")
    public Response desactivarUsuario(
            @PathParam("id") int id) {

        Response acceso = validarAccesoUsuarios();

        if (acceso != null) {
            return acceso;
        }

        if (id <= 0) {
            return error(400, "ID no valido.");
        }

        Integer idActual = idUsuarioSesion();

        if (idActual != null && idActual == id) {

            return error(400,
                    "No puede desactivar su propia cuenta.");
        }

        try {

            Usuario usuario = manager.getUsuario(id);

            Response permiso =
                    validarUsuarioObjetivo(usuario);

            if (permiso != null) {
                return permiso;
            }

            Map<String, Object> resultado =
                    manager.desactivarUsuario(id);

            return responderOperacion(resultado);

        } catch (Exception e) {

            e.printStackTrace();

            return error(500,
                    "Error interno al desactivar usuario.");
        }
    }

    // ============================================
    // 12. REACTIVAR USUARIO
    // PUT /api/usuarios/{id}/reactivar
    // ============================================

    @PUT
    @Path("{id}/reactivar")
    public Response reactivarUsuario(
            @PathParam("id") int id) {

        Response acceso = validarAccesoUsuarios();

        if (acceso != null) {
            return acceso;
        }

        if (id <= 0) {
            return error(400, "ID no valido.");
        }

        try {

            Usuario usuario = manager.getUsuario(id);

            Response permiso =
                    validarUsuarioObjetivo(usuario);

            if (permiso != null) {
                return permiso;
            }

            Map<String, Object> resultado =
                    manager.reactivarUsuario(id);

            return responderOperacion(resultado);

        } catch (Exception e) {

            e.printStackTrace();

            return error(500,
                    "Error interno al reactivar usuario.");
        }
    }

    // ============================================
    // 13. CAMBIAR CONTRASENA
    // PUT /api/usuarios/{id}/clave
    // ============================================

    @PUT
    @Path("{id}/clave")
    public Response cambiarClaveUsuario(
            @PathParam("id") int id,
            Map<String, Object> datos) {

        Response acceso = validarAccesoUsuarios();

        if (acceso != null) {
            return acceso;
        }

        if (id <= 0 || datos == null) {

            return error(400,
                    "ID o datos no validos.");
        }

        try {

            Usuario usuario = manager.getUsuario(id);

            Response permiso =
                    validarUsuarioObjetivo(usuario);

            if (permiso != null) {
                return permiso;
            }

            String claveNueva =
                    obtenerTexto(datos, "claveNueva");

            if (claveNueva == null
                    || claveNueva.isBlank()
                    || claveNueva.length() > 255) {

                return error(400,
                        "La nueva clave es obligatoria y no puede superar 255 caracteres.");
            }

            Map<String, Object> resultado =
                    manager.cambiarClaveUsuario(
                            id,
                            claveNueva
                    );

            return responderOperacion(resultado);

        } catch (Exception e) {

            e.printStackTrace();

            return error(500,
                    "Error interno al cambiar la contrasena.");
        }
    }

    // ============================================
    // 14. FUNCIONES AUXILIARES
    // ============================================

    private String obtenerTexto(
            Map<String, Object> datos,
            String campo) {

        Object valor = datos.get(campo);

        return valor == null
                ? null
                : valor.toString().trim();
    }

    private Integer obtenerEnteroOpcional(
            Map<String, Object> datos,
            String campo) {

        Object valor = datos.get(campo);

        if (valor == null
                || valor.toString().isBlank()) {

            return null;
        }

        try {

            int numero = Integer.parseInt(
                    valor.toString()
            );

            if (numero <= 0) {

                throw new IllegalArgumentException(
                        "El ID de sucursal debe ser positivo."
                );
            }

            return numero;

        } catch (NumberFormatException e) {

            throw new IllegalArgumentException(
                    "El ID de sucursal no es valido."
            );
        }
    }

    private Response respuestaUsuarios(
            List<Usuario> usuarios) {

        Map<String, Object> respuesta =
                new HashMap<>();

        respuesta.put("estado", "OK");
        respuesta.put("cantidad", usuarios.size());
        respuesta.put("usuarios", usuarios);

        return Response.ok(respuesta).build();
    }

    private Response responderOperacion(
            Map<String, Object> resultado) {

        if (resultado == null
                || !(resultado.get("idSalida")
                        instanceof Number)) {

            return error(500,
                    "Respuesta invalida de la base de datos.");
        }

        int idSalida = ((Number)
                resultado.get("idSalida")).intValue();

        Map<String, Object> respuesta =
                new HashMap<>();

        respuesta.put(
                "mensaje",
                resultado.get("mensaje")
        );

        if (idSalida <= 0) {

            respuesta.put("estado", "ERROR");

            return Response.status(400)
                    .entity(respuesta)
                    .build();
        }

        respuesta.put("estado", "OK");
        respuesta.put("idSalida", idSalida);

        return Response.ok(respuesta).build();
    }

    private Response error(
            int codigo,
            String mensaje) {

        Map<String, Object> respuesta =
                new HashMap<>();

        respuesta.put("estado", "ERROR");
        respuesta.put("mensaje", mensaje);

        return Response.status(codigo)
                .entity(respuesta)
                .build();
    }
}
