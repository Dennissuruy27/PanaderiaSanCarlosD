
package com.mycompany.proyectoweb.model;

import java.util.Date;

public class Usuario {

    private int idUsuario;
    private String nombreUsuario;
    private String usuario;
    private String rol;
    private Integer idSucursal;
    private String nombreSucursal;

    // NUEVOS ATRIBUTOS
    private Integer activo;
    private Date fechaCreacion;

    // CONSTRUCTOR VACÍO
    public Usuario() {
    }

    // CONSTRUCTOR ORIGINAL
    public Usuario(
            int idUsuario,
            String nombreUsuario,
            String usuario,
            String rol,
            Integer idSucursal,
            String nombreSucursal
    ) {
        this.idUsuario = idUsuario;
        this.nombreUsuario = nombreUsuario;
        this.usuario = usuario;
        this.rol = rol;
        this.idSucursal = idSucursal;
        this.nombreSucursal = nombreSucursal;
    }

    // GETTERS Y SETTERS

    public int getIdUsuario() {
        return idUsuario;
    }

    public void setIdUsuario(int idUsuario) {
        this.idUsuario = idUsuario;
    }

    public String getNombreUsuario() {
        return nombreUsuario;
    }

    public void setNombreUsuario(String nombreUsuario) {
        this.nombreUsuario = nombreUsuario;
    }

    public String getUsuario() {
        return usuario;
    }

    public void setUsuario(String usuario) {
        this.usuario = usuario;
    }

    public String getRol() {
        return rol;
    }

    public void setRol(String rol) {
        this.rol = rol;
    }

    public Integer getIdSucursal() {
        return idSucursal;
    }

    public void setIdSucursal(Integer idSucursal) {
        this.idSucursal = idSucursal;
    }

    public String getNombreSucursal() {
        return nombreSucursal;
    }

    public void setNombreSucursal(String nombreSucursal) {
        this.nombreSucursal = nombreSucursal;
    }

    // NUEVOS GETTERS Y SETTERS

    public Integer getActivo() {
        return activo;
    }

    public void setActivo(Integer activo) {
        this.activo = activo;
    }

    public Date getFechaCreacion() {
        return fechaCreacion;
    }

    public void setFechaCreacion(Date fechaCreacion) {
        this.fechaCreacion = fechaCreacion;
    }
}

