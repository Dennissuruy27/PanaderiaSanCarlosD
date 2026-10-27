/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.mycompany.proyectoweb.model;

/**
 *
 * @author Dennis Suruy
 */
public class PedidoDetalleRequest {
    private int idProducto;
    private double cantidadDp;

    public PedidoDetalleRequest() {
    }

    public int getIdProducto() {
        return idProducto;
    }

    public void setIdProducto(int idProducto) {
        this.idProducto = idProducto;
    }

    public double getCantidadDp() {
        return cantidadDp;
    }

    public void setCantidadDp(double cantidadDp) {
        this.cantidadDp = cantidadDp;
    }
}
