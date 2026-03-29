package com.collabcode.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.collabcode.model.Problem;

@Repository
public interface ProblemRepository extends JpaRepository<Problem, Long> {

    @Query(value = "SELECT * FROM problems ORDER BY RANDOM() LIMIT 1", nativeQuery = true)
    Problem findRandomProblem();
}
