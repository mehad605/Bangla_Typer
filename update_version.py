import sys
import re
import os
import json
from datetime import datetime

def update_file(file_path, pattern, replacement, count=0):
    if not os.path.exists(file_path):
        print(f"Warning: {file_path} not found.")
        return False
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Use flags=re.MULTILINE if pattern starts with ^
    flags = 0
    if pattern.startswith('^'):
        flags = re.MULTILINE
        
    new_content = re.sub(pattern, replacement, content, count=count, flags=flags)
    
    if new_content == content:
        print(f"No changes made to {file_path} (pattern not found or version identical).")
        return False
        
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Updated {file_path}")
    return True

def update_json(file_path, key_path, new_version):
    if not os.path.exists(file_path):
        print(f"Warning: {file_path} not found.")
        return False
        
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Simple one-level key path for now
    if key_path in data:
        if data[key_path] == new_version:
            print(f"Version in {file_path} is already {new_version}")
            return False
        data[key_path] = new_version
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
            f.write('\n')
        print(f"Updated {file_path}")
        return True
    else:
        print(f"Key {key_path} not found in {file_path}")
        return False

def main():
    if len(sys.argv) < 2:
        print("Usage: python update_version.py <new_version>")
        sys.exit(1)
    
    raw_input = sys.argv[1]
    # Handle "update 1.1.1" style or just "1.1.1"
    if raw_input.lower().startswith('update '):
        new_version = raw_input[7:].lstrip('v')
    else:
        new_version = raw_input.lstrip('v')
        
    today = datetime.now().strftime('%Y-%m-%d')
    
    print(f"Updating project version to: {new_version}")
    
    # 1. package.json
    update_json('package.json', 'version', new_version)
    
    # 2. pyproject.toml
    update_file('pyproject.toml', r'^version = ".*?"', f'version = "{new_version}"', count=1)
    
    # 3. src-tauri/tauri.conf.json
    update_json('src-tauri/tauri.conf.json', 'version', new_version)
    
    # 4. src-tauri/Cargo.toml
    update_file('src-tauri/Cargo.toml', r'^version = ".*?"', f'version = "{new_version}"', count=1)
    
    print("\nVersion update complete. Please review changes and update CHANGELOG.md manually.")

if __name__ == "__main__":
    main()
