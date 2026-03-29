package com.collabcode.controller;

import com.collabcode.model.ExecutionRequest;
import com.collabcode.model.ExecutionResult;
import com.collabcode.service.DockerExecutionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/execute")
@CrossOrigin(origins = "*")
public class CodeExecutionController {

    @Autowired
    private DockerExecutionService executionService;

    @PostMapping
    public ExecutionResult executeCode(@RequestBody ExecutionRequest request) {
        return executionService.execute(request.getLanguage(), request.getCode());
    }
}
