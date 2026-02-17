CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE yearbooks (
    year INTEGER PRIMARY KEY,
    theme VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE departments (
    code VARCHAR(4) PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE students (
    student_id VARCHAR(9) PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(14),
    department VARCHAR(4) REFERENCES departments(code),
    photo_url TEXT,
    bio TEXT,
    motto TEXT,
    graduation_year INTEGER NOT NULL REFERENCES yearbooks(year),
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE albums (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('personal', 'group', 'batch', 'department')),
    created_by VARCHAR(9) REFERENCES students(student_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE memories (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    created_by VARCHAR(9) REFERENCES students(student_id),
    album_id INTEGER REFERENCES albums(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE memory_participants (
    memory_id INTEGER REFERENCES memories(id) ON DELETE CASCADE,
    student_id VARCHAR(9) REFERENCES students(student_id) ON DELETE CASCADE,
    PRIMARY KEY (memory_id, student_id)
);

CREATE TABLE images (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('student', 'memory')),
    entity_id VARCHAR(20) NOT NULL,
    photo_url TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(entity_type, entity_id, sort_order),
    CHECK ((entity_type = 'student') OR (entity_type = 'memory'))
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id VARCHAR(9) FOREIGN KEY UNIQUE REFERENCES students(student_id),
  email UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'student',
  created_at TIMESTAMP DEFAULT now(),
  last_login TIMESTAMP NULL,
)

CREATE INDEX idx_students_year ON students(graduation_year);
CREATE INDEX idx_students_name ON students(first_name, last_name);
CREATE INDEX idx_images_entity ON images(entity_type, entity_id);
CREATE INDEX idx_images_entity_order ON images(entity_type, entity_id, sort_order);
CREATE INDEX idx_users_email ON users(email);
