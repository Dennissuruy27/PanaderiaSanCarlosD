/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.mycompany.proyectoweb.model;

/**
 *
 * @author Dennis Suruy
 */
public class PedidoDetalle {
    private int idDetalle;
    private int idPedido;
    private int idProducto;
    private String nombreProducto;
    private double cantidadDp;
    private double precioDp;
    private double subtotal;

    public PedidoDetalle() {
    }

    public int getIdDetalle() {
        return idDetalle;
    }

    public void setIdDetalle(int idDetalle) {
        this.idDetalle = idDetalle;
    }

    public int getIdPedido() {
        return idPedido;
    }

    public void setIdPedido(int idPedido) {
        this.idPedido = idPedido;
    }

    public int getIdProducto() {
        return idProducto;
    }

    public void setIdProducto(int idProducto) {
        this.idProducto = idProducto;
    }

    public String getNombreProducto() {
        return nombreProducto;
    }

    public void setNombreProducto(String nombreProducto) {
        this.nombreProducto = nombreProducto;
    }

    public double getCantidadDp() {
        return cantidadDp;
    }

    public void setCantidadDp(double cantidadDp) {
        this.cantidadDp = cantidadDp;
    }

    public double getPrecioDp() {
        return precioDp;
    }

    public void setPrecioDp(double precioDp) {
        this.precioDp = precioDp;
    }

    public double getSubtotal() {
        return subtotal;
    }

    public void setSubtotal(double subtotal) {
        this.subtotal = subtotal;
    }
}
