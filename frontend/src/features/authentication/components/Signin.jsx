import React from "react";
import useSignin from "../hooks/useSignin";
import { useSelector } from "react-redux";

const Signin = () => {
  const {
    email,
    setEmail,
    password,
    setPassword,
    handleSignin,
    isLoading,
    error,
  } = useSignin();
  const { currentUser } = useSelector((state) => state.user);
  const isActive = currentUser?.isActive;

  return (
    <div className="flex justify-center items-center min-h-screen bg-orange-200 p-4 relative overflow-hidden" >   {/* Top-Right Light Effect */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-orange-400 via-transparent to-transparent rounded-full blur-3xl opacity-20 animate-pulse"></div>

      {/* Bottom-Left Light Effect */}
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-orange-400 via-transparent to-transparent rounded-full blur-3xl opacity-20 animate-pulse"></div>

      {/* Additional floating elements for depth */}
      <div className="absolute top-20 right-20 w-32 h-32 bg-orange-300 rounded-full blur-2xl opacity-10 animate-bounce"></div>
      <div
        className="absolute bottom-20 left-20 w-32 h-32 bg-orange-300 rounded-full blur-2xl opacity-10 animate-bounce"
        style={{ animationDelay: "2s" }}
      ></div>

      <div className="w-full max-w-md relative z-10">
        {/* Login Form */}
        <form
          onSubmit={handleSignin}
          className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 space-y-6 transform hover:shadow-xl transition-all duration-300 border border-white/20"
        >
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-x-3">
              <div className="relative">
                <img
                  src="logo.png"
                  alt="logo"
                  className="h-14 w-14 rounded-full border-2 border-orange-800 shadow-lg"
                />
                <div className="absolute -inset-1 bg-orange-400 rounded-full blur opacity-30 animate-ping"></div>
              </div>
              <h1 className="text-3xl font-bold text-orange-400 drop-shadow-sm">
                AKAZ
              </h1>
            </div><p className="text-gray-600 mt-2">Please enter your details</p>
          </div>

          {/* Email Input */}
          <div className="space-y-2">
            <label className="block text-left text-gray-700 font-medium">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="w-full px-4 py-3 pr-5 focus:outline-none rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-800 focus:border-orange-800 transition-all duration-200 bg-gray-50 text-left hover:bg-white shadow-sm"
                dir="ltr"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <label className="block text-left text-gray-700 font-medium">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 pr-5 focus:outline-none rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-800 focus:border-orange-800 transition-all duration-200 bg-gray-50 text-left hover:bg-white shadow-sm"
                dir="ltr"
              />
            </div>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-orange-200 text-black py-4 rounded-xl font-semibold text-lg transform hover:scale-105 hover:from-orange-700 hover:to-orange-600 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none cursor-pointer relative overflow-hidden group"
          >
            {/* Button shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>

            {isLoading ? (
              <div className="flex items-center justify-center space-x-2 relative z-10">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>logging in...</span>
              </div>
            ) : (
              <span className="relative z-10">Login</span>
            )}
          </button>

          {/* Error Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-right transform transition-all duration-300 animate-fade-in">
              <div className="flex items-center justify-end space-x-2 space-x-reverse">
                <svg
                  className="w-5 h-5 text-red-500 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-red-700 font-medium text-sm">{error}</p>
              </div>
            </div>
          )}

          {isActive === false && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-right transform transition-all duration-300 animate-fade-in">
              <div className="flex items-center justify-end space-x-2 space-x-reverse">
                <svg
                  className="w-5 h-5 text-yellow-600 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                <p className="text-yellow-800 font-medium text-sm">
                  Your account is inactive
                </p>
              </div>
            </div>
          )}
          <a href="/forgot_password">Forgot password?</a>
          {/* Footer */}
          <div className="text-center pt-4 border-t border-gray-100">
            <p className="text-gray-600 text-sm">
              AKAZ - High Quality Products
            </p>
            <p className="text-gray-500 text-xs mt-1">
              Arash Khan Afghan Zone
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Signin;
