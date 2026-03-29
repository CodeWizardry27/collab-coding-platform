package com.collabcode.service;

import com.collabcode.model.ExecutionResult;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

@Service
public class DockerExecutionService {

    public ExecutionResult execute(String language, String code) {
        long startTime = System.currentTimeMillis();
        String output = "";
        String error = "";

        try {
            // Create temporary directory for code execution
            Path tempDir = Files.createTempDirectory("collabcode-exec-");
            File sourceFile;
            String[] runCmd;

            if ("python".equalsIgnoreCase(language)) {
                sourceFile = new File(tempDir.toFile(), "main.py");
                runCmd = new String[]{"python", sourceFile.getAbsolutePath()};
            } else if ("java".equalsIgnoreCase(language)) {
                sourceFile = new File(tempDir.toFile(), "Main.java");
                runCmd = new String[]{"java", sourceFile.getAbsolutePath()};
            } else {
                return new ExecutionResult("", "Unsupported language: " + language, 0);
            }

            Files.writeString(sourceFile.toPath(), code);

            ProcessBuilder pb = new ProcessBuilder(runCmd);
            Process process = pb.start();
            
            boolean finished = process.waitFor(15, TimeUnit.SECONDS);

            if (!finished) {
                process.destroyForcibly();
                return new ExecutionResult("", "Execution timed out! The process exceeded the 15-second limit.", System.currentTimeMillis() - startTime);
            }

            BufferedReader stdInput = new BufferedReader(new InputStreamReader(process.getInputStream()));
            BufferedReader stdError = new BufferedReader(new InputStreamReader(process.getErrorStream()));

            String s;
            StringBuilder outBuilder = new StringBuilder();
            while ((s = stdInput.readLine()) != null) {
                outBuilder.append(s).append("\n");
            }
            output = outBuilder.toString();

            StringBuilder errBuilder = new StringBuilder();
            while ((s = stdError.readLine()) != null) {
                errBuilder.append(s).append("\n");
            }
            error = errBuilder.toString();

        } catch (Exception e) {
            error = "Execution exception: " + e.getMessage();
        }

        return new ExecutionResult(output, error, System.currentTimeMillis() - startTime);
    }
}
