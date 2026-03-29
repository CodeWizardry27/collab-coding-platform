package com.collabcode.model;

public class ExecutionResult {
    private String output;
    private String error;
    private long executionTimeMs;

    public ExecutionResult(String output, String error, long executionTimeMs) {
        this.output = output;
        this.error = error;
        this.executionTimeMs = executionTimeMs;
    }

    public String getOutput() { return output; }
    public void setOutput(String output) { this.output = output; }

    public String getError() { return error; }
    public void setError(String error) { this.error = error; }

    public long getExecutionTimeMs() { return executionTimeMs; }
    public void setExecutionTimeMs(long executionTimeMs) { this.executionTimeMs = executionTimeMs; }
}
