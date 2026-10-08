# ---- 1. Build the React frontend ----
FROM node:20-alpine AS frontend
WORKDIR /fe
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# ---- 2. Build the Spring Boot jar with the frontend bundled in ----
FROM maven:3.9-eclipse-temurin-17 AS backend
WORKDIR /be
COPY backend/pom.xml .
RUN mvn -q dependency:go-offline
COPY backend/src ./src
COPY --from=frontend /fe/dist ./src/main/resources/static
RUN mvn -q package -DskipTests

# ---- 3. Run ----
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=backend /be/target/*.jar app.jar
ENV H2_CONSOLE_ENABLED=false
EXPOSE 8080
CMD ["java", "-Xmx350m", "-XX:+UseSerialGC", "-jar", "app.jar"]
