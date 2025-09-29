package com.springcart.category;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Category entity for classifying products.
 * Matches the PostgreSQL schema created in docker/postgres/init.sql:
 *   Table: categories (id, name, created_at, updated_at)
 *
 * Refactored to plain Java (no Lombok) for JDK 24 compatibility.
 */
@Entity
@Table(
    name = "categories",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_categories_name", columnNames = {"name"})
    },
    indexes = {
        @Index(name = "ix_categories_name", columnList = "name")
    }
)
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Category name is required")
    @Size(max = 255, message = "Name must be at most 255 characters")
    @Column(nullable = false, length = 255)
    private String name;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Category() {
        // No-args constructor required by JPA
    }

    public Category(Long id, String name, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.name = name;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    // ----------- Getters / Setters -----------

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}

/**
 * Read-only REST controller for Categories.
 * Requirements: List categories; no create/update/delete endpoints.
 *
 * Note: The CategoryRepository is defined in its own public file
 * (CategoryRepository.java) so the repository interface is not duplicated here.
 */
@RestController
@RequestMapping("/api/categories")
@CrossOrigin(origins = {
        "http://localhost:3000",
        "http://localhost:5173"
})
class CategoryController {

    private final CategoryRepository repository;

    CategoryController(CategoryRepository repository) {
        this.repository = repository;
    }

    // List all categories (sorted by name ASC)
    @GetMapping
    public List<Category> list() {
        return repository.findAll(Sort.by(Sort.Direction.ASC, "name"));
    }

    // Get a single category by id (useful for admin views)
    @GetMapping("/{id}")
    public Category getById(@PathVariable Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));
    }
}
