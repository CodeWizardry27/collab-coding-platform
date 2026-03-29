# Stage 1: Build the Application
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /build

# Copy only the POM first to cache dependencies (speeds up deployment)
# Since this Dockerfile is now inside the 'backend' folder natively:
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy the source code
COPY src ./src

# Build the executable JAR
RUN mvn clean package -DskipTests

# Stage 2: Create the highly-customized Cloud Runtime Environment
FROM ubuntu:22.04

# Expose Port 8080 required by Render
EXPOSE 8080

# Essential step: Install OpenJDK 17 AND Python 3 so the ProcessBuilder engine has access to both binaries
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    openjdk-17-jre-headless \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the built artifacts from Stage 1
COPY --from=build /build/target/backend-0.0.1-SNAPSHOT.jar /app/collabcode.jar

# Add non-root user for security (best practice for production)
RUN useradd -m collabcodeuser
USER collabcodeuser

# Start the Spring Boot Application
ENTRYPOINT ["java", "-jar", "/app/collabcode.jar"]
