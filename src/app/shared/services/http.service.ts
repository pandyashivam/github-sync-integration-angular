import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from "@angular/core";
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HttpService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  
  get<T>(endpoint: string, params?: any, headers?: HttpHeaders): Observable<T> {
    const options = {
      headers: headers,
      params: this.buildParams(params)
    };
    
    return this.http.get<T>(`${this.apiUrl}${endpoint}`, options);
  }

  
  post<T>(endpoint: string, body: any, headers?: HttpHeaders): Observable<T> {
    const options = {
      headers: headers
    };
    
    return this.http.post<T>(`${this.apiUrl}${endpoint}`, body, options);
  }

  
  /**
   * Perform an HTTP DELETE request
   * @param endpoint The API endpoint
   * @param params Optional query parameters
   * @param headers Optional HTTP headers
   * @returns Observable with the response
   */
  delete<T>(endpoint: string, params?: any, headers?: HttpHeaders): Observable<T> {
    const options = {
      headers: headers,
      params: this.buildParams(params)
    };
    
    return this.http.delete<T>(`${this.apiUrl}${endpoint}`, options);
  }

  
  private buildParams(params?: any): HttpParams {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    
    return httpParams;
  }
}
