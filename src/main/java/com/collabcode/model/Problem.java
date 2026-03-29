package com.collabcode.model;

import jakarta.persistence.*;

@Entity
@Table(name = "problems")
public class Problem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    private String difficulty;

    @Column(columnDefinition = "TEXT")
    private String templatePython;

    @Column(columnDefinition = "TEXT")
    private String templateJava;

    public Problem() {
    }

    public Problem(String title, String description, String difficulty, String templatePython, String templateJava) {
        this.title = title;
        this.description = description;
        this.difficulty = difficulty;
        this.templatePython = templatePython;
        this.templateJava = templateJava;
    }

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getDifficulty() { return difficulty; }
    public String getTemplatePython() { return templatePython; }
    public String getTemplateJava() { return templateJava; }
}
