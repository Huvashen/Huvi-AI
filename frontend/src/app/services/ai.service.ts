import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly apiUrl = 'http://localhost:3001/api';

  constructor(private http: HttpClient) {}

  ask(question: string) {
    return this.http.post<{ question: string; answer: string }>(
      `${this.apiUrl}/ask`,
      { question }
    );
  }

  getProducts() {
    return this.http.get<any[]>(`${this.apiUrl}/products`);
  }

  runQaCheck(sku: string) {
    return this.http.post<{ sku: string; answer: string }>(
      `${this.apiUrl}/qa-check`,
      { sku }
    );
  }
}