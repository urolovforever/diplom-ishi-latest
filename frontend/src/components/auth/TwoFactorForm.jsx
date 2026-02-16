import { useState } from 'react';

function TwoFactorForm({ onSubmit, loading }) {
  const [token, setToken] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(token);
  };

  return (
    <form onSubmit={handleSubmit}>
      <p className="text-sm text-gray-600 mb-4">
        Enter the 6-digit code from your authenticator app.
      </p>
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          2FA Code
        </label>
        <input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          maxLength={6}
          pattern="[0-9]{6}"
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Verifying...' : 'Verify'}
      </button>
    </form>
  );
}

export default TwoFactorForm;
