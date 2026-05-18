# syntax=docker/dockerfile:1

FROM maven:3.9.9-eclipse-temurin-21-alpine AS build
WORKDIR /app

COPY pom.xml .
RUN mvn -B -q dependency:go-offline -DskipTests || true

COPY src ./src
RUN mvn -B -q package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S spring && adduser -S spring -G spring \
  && mkdir -p /app/data && chown -R spring:spring /app/data
USER spring:spring

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

# H2 file DB (mount a volume at /app/data for persistence)
VOLUME ["/app/data"]

ENV GOOGLE_CLIENT_ID="" \
    JWT_SECRET="change-me-in-production-min-32-chars!!"

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
