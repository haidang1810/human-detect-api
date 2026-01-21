import { test, expect, describe, beforeEach } from "bun:test"
import { BookService } from "../src/services/book.service"
import { BookRepository } from "../src/models/book.repository"
import type { CreateBookInput } from "../src/types/book.types"

describe("BookService", () => {
  let repository: BookRepository
  let service: BookService

  beforeEach(() => {
    repository = new BookRepository()
    service = new BookService(repository)
  })

  test("should create a book", () => {
    const input: CreateBookInput = {
      title: "Clean Code",
      author: "Robert C. Martin",
      pages: 464,
    }

    const book = service.createBook(input)

    expect(book.id).toBe(1)
    expect(book.title).toBe(input.title)
    expect(book.author).toBe(input.author)
    expect(book.pages).toBe(input.pages)
    expect(book.createdAt).toBeInstanceOf(Date)
  })

  test("should get all books", () => {
    const input: CreateBookInput = {
      title: "Clean Code",
      author: "Robert C. Martin",
      pages: 464,
    }

    service.createBook(input)

    const books = service.getAllBooks()
    expect(books).toHaveLength(1)
    expect(books[0]?.title).toBe(input.title)
  })

  test("should get book by id", () => {
    const input: CreateBookInput = {
      title: "Clean Code",
      author: "Robert C. Martin",
      pages: 464,
    }

    const created = service.createBook(input)
    const found = service.getBookById(created.id)

    expect(found).toBeDefined()
    expect(found?.id).toBe(created.id)
    expect(found?.title).toBe(input.title)
  })

  test("should update book", () => {
    const input: CreateBookInput = {
      title: "Clean Code",
      author: "Robert C. Martin",
      pages: 464,
    }

    const created = service.createBook(input)
    const updated = service.updateBook(created.id, { title: "Updated Title" })

    expect(updated).toBeDefined()
    expect(updated?.title).toBe("Updated Title")
    expect(updated?.author).toBe(input.author)
  })

  test("should delete book", () => {
    const input: CreateBookInput = {
      title: "Clean Code",
      author: "Robert C. Martin",
      pages: 464,
    }

    const created = service.createBook(input)
    const deleted = service.deleteBook(created.id)

    expect(deleted).toBe(true)
    expect(service.getBookById(created.id)).toBeNull()
  })

  test("should throw error for missing required fields", () => {
    const input = {
      title: "Clean Code",
      author: "Robert C. Martin",
    } as CreateBookInput

    expect(() => service.createBook(input)).toThrow("Missing required fields")
  })

  test("should throw error for invalid pages", () => {
    const input: CreateBookInput = {
      title: "Clean Code",
      author: "Robert C. Martin",
      pages: -1,
    }

    expect(() => service.createBook(input)).toThrow("Pages must be greater than 0")
  })
})
