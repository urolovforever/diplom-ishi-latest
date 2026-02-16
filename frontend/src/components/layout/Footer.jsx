function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 px-6 py-3">
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Secure Confession Platform v1.0</span>
        <span>&copy; {new Date().getFullYear()} SCP. All rights reserved.</span>
      </div>
    </footer>
  );
}

export default Footer;
