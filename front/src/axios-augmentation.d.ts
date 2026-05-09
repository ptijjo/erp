import "axios";

declare module "axios" {
  interface AxiosRequestConfig {
    _retry?: boolean;
    /** Évite la boucle sur `POST /auth/refresh` (interceptor 401). */
    skipAuthRefresh?: boolean;
  }
}
