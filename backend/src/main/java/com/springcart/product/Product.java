package com.springcart.product;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.springcart.category.Category;
import com.springcart.category.CategoryRepository;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Product entity aligned with the PostgreSQL schema (products).
 *
 * Table (see docker/postgres/init.sql):
 *  - id BIGSERIAL PRIMARY KEY
 *  - name VARCHAR(255) NOT NULL
 *  - description TEXT
 *  - price NUMERIC(15,2) NOT NULL CHECK (price >= 0)
 *  - image_url TEXT
 *  - total_items_in_stock INTEGER NOT NULL DEFAULT 0 CHECK (total_items_in_stock >= 0)
 *  - category_id BIGINT REFERENCES categories(id)
 *  - created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 *  - updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 *
 * Refactored to plain Java (no Lombok) for JDK 24 compatibility.
 */
@Entity
@Table(
    name = "products",
    indexes = {
        @Index(name = "ix_products_name", columnList = "name"),
        @Index(name = "ix_products_category_id", columnList = "category_id")
    }
)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Product name is required")
    @Size(max = 255, message = "Name must be at most 255 characters")
    @Column(nullable = false, length = 255)
    private String name;


    @Column(columnDefinition = "text")
    private String description;

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Price must be >= 0")
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal price;


    @Column(name = "image_url", columnDefinition = "text")

    private String imageUrl;


    @NotNull
    @Min(value = 0, message = "Total items in stock must be >= 0")
    @Column(name = "total_items_in_stock", nullable = false)
    private Integer totalItemsInStock;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", foreignKey = @ForeignKey(name = "fk_products_category_id"))
    private Category category;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Product() {
        // JPA requires a no-arg constructor
    }

    public Product(Long id,
                   String name,
                   String description,
                   BigDecimal price,
                   String imageUrl,
                   Integer totalItemsInStock,
                   Category category,
                   Instant createdAt,
                   Instant updatedAt) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.price = price;
        this.imageUrl = imageUrl;
        this.totalItemsInStock = totalItemsInStock;
        this.category = category;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.totalItemsInStock == null) {
            this.totalItemsInStock = 0;
        }
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

    public String getDescription() {
        return description;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public Integer getTotalItemsInStock() {
        return totalItemsInStock;
    }

    public Category getCategory() {
        return category;
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

    public void setDescription(String description) {
        this.description = description;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public void setTotalItemsInStock(Integer totalItemsInStock) {
        this.totalItemsInStock = totalItemsInStock;
    }

    public void setCategory(Category category) {
        this.category = category;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}

/**
 * Repository for Product with convenience queries for admin/dashboard stats and eager loading of Category.
 */
interface ProductRepository extends JpaRepository<Product, Long> {

    @Query("SELECT DISTINCT p FROM Product p LEFT JOIN FETCH p.category")
    List<Product> findAllWithCategory();

    @Query("SELECT DISTINCT p FROM Product p LEFT JOIN FETCH p.category WHERE p.id = :id")
    Optional<Product> findByIdWithCategory(@Param("id") Long id);

    @Query("SELECT DISTINCT p FROM Product p LEFT JOIN FETCH p.category WHERE LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%'))")
    List<Product> searchByNameWithCategory(@Param("q") String q);

    @Query("SELECT COALESCE(SUM(p.totalItemsInStock), 0) FROM Product p")
    Long sumTotalItemsInStock();

    @Query("SELECT COALESCE(SUM(p.price * p.totalItemsInStock), 0) FROM Product p")
    BigDecimal sumTotalInventoryValue();
}

/**
 * REST controller exposing endpoints for:
 *  - Listing products (for Admin page) with Category info included
 *  *  - Fetching a product by id
 *  *  - Searching by name
 *  *  - Inventory summary for Dashboard (total products, total items in stock, total inventory value)
 *  *  - Create / Update / Delete operations for admin
 */
@RestController
@RequestMapping("/api/products")
@CrossOrigin(origins = {
        "http://localhost:3000",
        "http://localhost:5173"
})
class ProductController {

    private final ProductRepository repository;
    private final CategoryRepository categoryRepository;

    ProductController(ProductRepository repository, CategoryRepository categoryRepository) {
        this.repository = repository;
        this.categoryRepository = categoryRepository;
    }

    // Admin list: all products (with category)
    @GetMapping
    public List<Product> list(@RequestParam(name = "q", required = false) String q) {
        if (q != null && !q.isBlank()) {
            return repository.searchByNameWithCategory(q.trim());
        }
        return repository.findAllWithCategory();
    }

    // Product details (with category)
    @GetMapping("/{id}")
    public Product getById(@PathVariable Long id) {
        return repository.findByIdWithCategory(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
    }

    // Create a new product (admin)
    @PostMapping
    public ResponseEntity<Product> create(@Valid @RequestBody ProductRequest req) {
        Category category = null;
        if (req.categoryId() != null) {
            category = categoryRepository.findById(req.categoryId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category not found"));
        }

        Product p = new Product();
        p.setName(req.name());
        p.setDescription(req.description());
        p.setPrice(req.price());
        p.setImageUrl(req.imageUrl());
        p.setTotalItemsInStock(req.totalItemsInStock() != null ? req.totalItemsInStock() : 0);
        p.setCategory(category);

        Product saved = repository.save(p);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // Update an existing product (admin)
    @PutMapping("/{id}")
    public Product update(@PathVariable Long id, @Valid @RequestBody ProductRequest req) {
        Product existing = repository.findByIdWithCategory(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));

        existing.setName(req.name());
        existing.setDescription(req.description());
        existing.setPrice(req.price());
        existing.setImageUrl(req.imageUrl());
        existing.setTotalItemsInStock(req.totalItemsInStock() != null ? req.totalItemsInStock() : existing.getTotalItemsInStock());

        if (req.categoryId() != null) {
            Category category = categoryRepository.findById(req.categoryId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category not found"));
            existing.setCategory(category);
        }

        return repository.save(existing);
    }

    // Delete a product (admin)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!repository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found");
        }
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // Dashboard summary:
    // - totalProducts
    // - totalItemsInStock
    // - totalInventoryValue (sum of price * totalItemsInStock)
    @GetMapping("/summary")
    public ProductSummary summary() {
        long totalProducts = repository.count();
        long totalItems = Optional.ofNullable(repository.sumTotalItemsInStock()).orElse(0L);
        BigDecimal totalValue = Optional.ofNullable(repository.sumTotalInventoryValue()).orElse(BigDecimal.ZERO);
        return new ProductSummary(totalProducts, totalItems, totalValue);
    }

    // DTOs and summary record
    public record ProductSummary(long totalProducts, long totalItemsInStock, BigDecimal totalInventoryValue) {}

    public static record ProductRequest(
            @NotBlank String name,
            String description,
            @NotNull BigDecimal price,
            String imageUrl,
            Integer totalItemsInStock,
            Long categoryId
    ) {}
}
