import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { AiService } from './services/ai.service';

type Product = {
  sku: string;
  name: string;
  brand: string;
  category: string;
  ingredients: string[];
  warnings: string[];
  storage: string;
  description: string;
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  products: Product[] = [];
  question = '';
  answer = '';
  loading = false;
  productsLoading = false;
  productsError = '';

  constructor(private ai: AiService) {
    this.loadProducts();
  }

loadProducts() {
  this.productsLoading = true;
  this.productsError = '';

  this.ai.getProducts().subscribe({
    next: (products) => {
      this.products = products;
      this.productsLoading = false;
    },
    error: (error) => {
      console.error('Failed to load products:', error);
      this.products = [];
      this.productsError = 'Could not load products. Make sure the backend API is running.';
      this.productsLoading = false;
    }
  });
}

  ask() {
    if (!this.question.trim()) return;

    this.loading = true;
    this.answer = '';

    this.ai.ask(this.question).subscribe({
      next: (res) => {
        this.answer = res.answer;
        this.loading = false;
      },
      error: () => {
        this.answer = 'AI request failed.';
        this.loading = false;
      }
    });
  }

  askAboutProduct(product: Product) {
    this.question = `Tell me about ${product.sku}`;
    this.ask();
  }

  qaCheck(product: Product) {
    this.loading = true;
    this.answer = '';

    this.ai.runQaCheck(product.sku).subscribe({
      next: (res) => {
        this.answer = res.answer;
        this.loading = false;
      },
      error: () => {
        this.answer = 'QA check failed.';
        this.loading = false;
      }
    });
  }
}