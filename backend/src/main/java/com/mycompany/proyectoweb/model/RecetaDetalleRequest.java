/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.mycompany.proyectoweb.model;

/**
 *
 * @author Dennis Suruy
 */
public class RecetaDetalleRequest {
    private int idProducto;
    private double cantidadD;

    public RecetaDetalleRequest() {
    }

    public int getIdProducto() {
        return idProducto;
    }

    public void setIdProducto(int idProducto) {
        this.idProducto = idProducto;
    }

    public double getCantidadD() {
        return cantidadD;
    }

    public void setCantidadD(double cantidadD) {
        this.cantidadD = cantidadD;
    }
}
