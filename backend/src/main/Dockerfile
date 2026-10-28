



# ETAPA 1: Compilar el backend con Maven y Java 21
FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /app

COPY backend/pom.xml .
COPY backend/src ./src

RUN mvn clean package -DskipTests

# ETAPA 2: Ejecutar la aplicación en Tomcat 9
FROM tomcat:9.0-jdk21-temurin

ENV JAVA_OPTS="-Xms64m -Xmx256m -XX:MaxMetaspaceSize=128m"

# Instalar unzip para extraer el Oracle Wallet
RUN apt-get update \
    && apt-get install -y --no-install-recommends unzip \
    && rm -rf /var/lib/apt/lists/*

# Copiar el backend compilado
COPY --from=build /app/target/*.war /usr/local/tomcat/webapps/PROYECTOWEB.war

# Copiar el frontend dentro de la misma aplicación
COPY frontend/ /usr/local/tomcat/webapps/PROYECTOWEB/

# Configurar el puerto utilizado por Render
RUN sed -i 's/port="8080"/port="10000"/' /usr/local/tomcat/conf/server.xml

# Configurar SameSite para las cookies
RUN sed -i 's|</Context>|    <CookieProcessor sameSiteCookies="lax" />\n</Context>|' \
    /usr/local/tomcat/conf/context.xml

# Crear directorio privado para Oracle Wallet
RUN mkdir -p /opt/oracle/wallet

# Configurar Oracle JDBC para localizar el Wallet
ENV JAVA_TOOL_OPTIONS="-Doracle.net.tns_admin=/opt/oracle/wallet"

EXPOSE 10000

# Reconstruir el Wallet al iniciar el contenedor
CMD ["sh", "-c", "set -eu; base64 -d /etc/secrets/wallet_base64.txt > /tmp/oracle-wallet.zip; unzip -oq /tmp/oracle-wallet.zip -d /opt/oracle/wallet; rm -f /tmp/oracle-wallet.zip; exec catalina.sh run"]




