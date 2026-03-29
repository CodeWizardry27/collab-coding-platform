package com.collabcode.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;

import com.collabcode.model.Problem;
import com.collabcode.repository.ProblemRepository;

@RestController
@RequestMapping("/api/problems")
@CrossOrigin(origins = "*") // Allows local file testing
public class ProblemController {

    @Autowired
    private ProblemRepository problemRepository;

    @GetMapping("/random")
    public Problem getRandomProblem() {
        Problem randomProblem = problemRepository.findRandomProblem();
        if (randomProblem == null) {
            // Fallback safe value if DB is empty
            return new Problem("Two Sum", "Given an array of integers `nums` and an integer `target`...", "Easy", "def solution():\n  pass", "class Solution {\n}");
        }
        return randomProblem;
    }
}
