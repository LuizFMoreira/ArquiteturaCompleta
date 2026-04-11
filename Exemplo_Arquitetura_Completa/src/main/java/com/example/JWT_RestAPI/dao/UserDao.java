package com.example.JWT_RestAPI.dao;

import com.example.JWT_RestAPI.model.UserEntity;
import java.util.Optional;

/**
 * Data Access Object (DAO) interface for UserEntity.
 * Abstracts the underlying persistence mechanism for user-related data access operations.
 */
public interface UserDao {
    
    /**
     * Finds a user by their username.
     * 
     * @param username The username to search for.
     * @return An Optional containing the UserEntity if found, or empty if not found.
     */
    Optional<UserEntity> findByUsername(String username);

    /**
     * Saves a user to the persistence store.
     * 
     * @param user The UserEntity to save.
     * @return The saved UserEntity.
     */
    UserEntity save(UserEntity user);
}
