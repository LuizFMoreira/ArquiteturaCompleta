package com.example.JWT_RestAPI.dao;

import com.example.JWT_RestAPI.model.UserEntity;
import com.example.JWT_RestAPI.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Implementation of UserDao using Spring Data JPA.
 * Orchestrates calls to the underlying UserRepository, allowing the rest of the application
 * (services, configurations) to depend on the abstract UserDao instead of the specific JPA repository.
 */
@Component
public class UserDaoImpl implements UserDao {

    private final UserRepository userRepository;

    @Autowired
    public UserDaoImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public Optional<UserEntity> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    @Override
    public UserEntity save(UserEntity user) {
        return userRepository.save(user);
    }
}
