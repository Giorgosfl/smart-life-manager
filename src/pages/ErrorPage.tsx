import { useRouteError, isRouteErrorResponse, useNavigate } from "react-router-dom";

export default function ErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  let title = "Something Went Wrong";
  let message = "An unexpected error occurred.";

  if (isRouteErrorResponse(error)) {
    title = error.status === 404 ? "Page Not Found" : `Error ${error.status}`;
    message =
      error.status === 404
        ? "The page you're looking for doesn't exist."
        : error.statusText || message;
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold mb-2">{title}</h1>
        <p className="text-sm text-muted mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="bg-card border border-card-border text-foreground rounded-lg px-4 py-2 text-sm transition-colors duration-150 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            Go Back
          </button>
          <button
            type="button"
            onClick={() => navigate("/devices")}
            className="bg-primary text-white rounded-lg px-4 py-2 text-sm transition-colors duration-150 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            Go to Devices
          </button>
        </div>
      </div>
    </div>
  );
}
