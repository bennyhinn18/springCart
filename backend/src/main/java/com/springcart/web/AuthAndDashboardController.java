package com.springcart.web;

import com.springcart.category.Category;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Provides:
 * - Dummy authentication endpoints: login/logout (accepts any non-empty username/password).
 * - Dashboard summary aggregation:
 *     - Total number of products
 *     - Total items in stock
 *     - Total inventory value (sum(price * total_items_in_stock))
 *     - List of categories (read-only)
 *
 * Notes:
 * - No real security is implemented here; this is intentionally open/dummy auth for demo purposes.
 * - Uses EntityManager with JPQL/native queries to avoid compile-time dependencies on repository interfaces.
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = {
        "http://localhost:3000",
        "http://localhost:5173"
})
public class AuthAndDashboardController {

    private final EntityManager em;

    public AuthAndDashboardController(EntityManager em) {
        this.em = em;
    }

    // ---------------------------
    // Auth (dummy) endpoints
    // ---------------------------

    /**
     * Dummy login endpoint that accepts any non-empty username and password.
     * Returns a fake token and an ADMIN role for simplicity.
     */
    @PostMapping("/auth/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        // Accept any credentials that are not blank; otherwise, validation will fail before reaching here.
        String token = UUID.randomUUID().toString();
        return ResponseEntity.ok(new LoginResponse(token, request.username(), "ADMIN"));
    }

    /**
     * Dummy logout endpoint. In a real app, you might invalidate a session or token.
     * Here it simply returns 204 to indicate "logged out".
     */
    @PostMapping("/auth/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.noContent().build();
    }

    // ---------------------------
    // Dashboard summary endpoint
    // ---------------------------

    /**
     * Returns dashboard stats:
     *  - totalProducts
     *  - totalItemsInStock
     *  - totalInventoryValue
     *  - categories (read-only list)
     *
     * Backed by direct queries via EntityManager (PostgreSQL schema as created by docker/postgres/init.sql).
     */
    @GetMapping("/dashboard")
    public DashboardSummary getDashboardSummary() {
        // Use native SQL for scalar aggregates to avoid portability quirks with JPQL arithmetic typing
        Number totalProductsN = (Number) em.createNativeQuery("select count(*) from products")
                .getSingleResult();
        long totalProducts = totalProductsN.longValue();

        Number totalItemsN = (Number) em.createNativeQuery("select coalesce(sum(total_items_in_stock), 0) from products")
                .getSingleResult();
        long totalItemsInStock = totalItemsN.longValue();

        BigDecimal totalInventoryValue = (BigDecimal) em.createNativeQuery("select coalesce(sum(price * total_items_in_stock), 0) from products")
                .getSingleResult();

        // Fetch categories (read-only list)
        TypedQuery<Category> q = em.createQuery("select c from Category c order by c.name asc", Category.class);
        List<CategoryDTO> categories = q.getResultList()
                .stream()
                .map(c -> new CategoryDTO(c.getId(), c.getName()))
                .collect(Collectors.toList());

        return new DashboardSummary(totalProducts, totalItemsInStock, totalInventoryValue, categories);
    }

    // ---------------------------
    // DTOs
    // ---------------------------

    public record LoginRequest(
            @NotBlank(message = "Username is required") String username,
            @NotBlank(message = "Password is required") String password
    ) { }

    public record LoginResponse(
            String token,
            String username,
            String role
    ) { }

    public record CategoryDTO(
            Long id,
            String name
    ) { }

    public record DashboardSummary(
            long totalProducts,
            long totalItemsInStock,
            BigDecimal totalInventoryValue,
            List<CategoryDTO> categories
    ) { }
}
