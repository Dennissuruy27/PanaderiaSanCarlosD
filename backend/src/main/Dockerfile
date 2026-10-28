
# Compilar el proyecto Maven con Java 21
FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /app

COPY pom.xml .
COPY src ./src

RUN mvn clean package -DskipTests

# Ejecutar la aplicación en Tomcat 9
FROM tomcat:9.0-jdk21-temurin

# Configuración de memoria para Render Free
ENV JAVA_OPTS="-Xms64m -Xmx256m -XX:MaxMetaspaceSize=128m"

# Desplegar el archivo WAR
COPY --from=build /app/target/*.war /usr/local/tomcat/webapps/PROYECTOWEB.war

# Configurar Tomcat para escuchar en el puerto 10000
RUN sed -i 's/port="8080"/port="10000"/' /usr/local/tomcat/conf/server.xml

EXPOSE 10000

CMD ["catalina.sh", "run"]
