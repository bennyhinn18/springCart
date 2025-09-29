package com.springcart.category;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for {@link Category} entities.
 *
 * Separated into its own file so it can be injected cleanly where needed.
 */
@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {

    /**
     * Find a category by name (case-insensitive).
     *
     * @param name category name
     * @return optional category
     */
    Optional<Category> findByNameIgnoreCase(String name);

    /**
     * Checks whether a category with the given name exists (case-insensitive).
     *
     * @param name category name
     * @return true if exists
     */
    boolean existsByNameIgnoreCase(String name);

    /**
     * Return all categories ordered by name ascending.
     *
     * @return list of categories sorted by name
     */
    List<Category> findAllByOrderByNameAsc();
}
