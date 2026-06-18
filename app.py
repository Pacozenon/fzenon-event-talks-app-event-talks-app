import os
import re
import time
import urllib.request
from urllib.error import URLError
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# In-memory cache configuration
# Default cache time: 10 minutes (600 seconds)
CACHE_DURATION = 600
cache = {
    "data": None,
    "last_fetched": 0
}

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
ATOM_NS = {'atom': 'http://www.w3.org/2005/Atom'}

def parse_release_notes():
    """Fetches and parses the BigQuery release notes Atom feed."""
    try:
        # Request feed with User-Agent header
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        req = urllib.request.Request(FEED_URL, headers=headers)
        
        # Open URL with a 15 second timeout
        with urllib.request.urlopen(req, timeout=15) as response:
            xml_data = response.read()
            
        root = ET.fromstring(xml_data)
        entries = []
        
        # Loop through all <entry> tags in Atom feed
        for entry in root.findall('atom:entry', ATOM_NS):
            title_elem = entry.find('atom:title', ATOM_NS)
            updated_elem = entry.find('atom:updated', ATOM_NS)
            link_elem = entry.find('atom:link', ATOM_NS)
            content_elem = entry.find('atom:content', ATOM_NS)
            
            title = title_elem.text.strip() if title_elem is not None and title_elem.text else "Unknown Date"
            updated = updated_elem.text.strip() if updated_elem is not None and updated_elem.text else ""
            
            # Extract link href
            link = ""
            if link_elem is not None:
                link = link_elem.attrib.get('href', '')
                
            content_html = content_elem.text if content_elem is not None and content_elem.text else ""
            
            # Categorize items within this day's entries
            # BigQuery release feed has sections starting with <h3>Category</h3>
            # Example: <h3>Feature</h3> <p>text</p> <h3>Changed</h3> <p>text</p>
            parts = re.split(r'<h3>(.*?)</h3>', content_html)
            items = []
            
            if len(parts) <= 1:
                # If no <h3> categories found, dump as general
                if content_html.strip():
                    items.append({
                        "category": "General",
                        "content": content_html.strip()
                    })
            else:
                # If there's leading text before the first <h3>
                if parts[0].strip():
                    items.append({
                        "category": "General",
                        "content": parts[0].strip()
                    })
                
                # Zip headers and descriptions
                for i in range(1, len(parts), 2):
                    category = parts[i].strip()
                    content = parts[i+1].strip() if i+1 < len(parts) else ""
                    
                    # Normalizing Category Titles to match client pills/stats
                    # (e.g. Change, Feature, Issue, Announcement, Breaking)
                    norm_category = "General"
                    if "feature" in category.lower():
                        norm_category = "Feature"
                    elif "change" in category.lower():
                        norm_category = "Change"
                    elif "breaking" in category.lower():
                        norm_category = "Breaking"
                    elif "issue" in category.lower():
                        norm_category = "Issue"
                    elif "announcement" in category.lower():
                        norm_category = "Announcement"
                    else:
                        norm_category = category # fallback
                        
                    items.append({
                        "category": norm_category,
                        "content": content
                    })
            
            entries.append({
                "title": title,
                "updated": updated,
                "link": link,
                "items": items
            })
            
        return {
            "success": True,
            "entries": entries
        }
        
    except URLError as e:
        return {
            "success": False,
            "error": f"Failed to reach feed server: {e.reason}"
        }
    except ET.ParseError:
        return {
            "success": False,
            "error": "Failed to parse the release notes feed XML structure."
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Unexpected error: {str(e)}"
        }

@app.route('/')
def index():
    """Serves the main release notes explorer page."""
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    """API endpoint providing flattened list of release notes."""
    # Check if a hard refresh is requested by query param (?refresh=true)
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    now = time.time()
    
    # Return cached data if valid and fresh, and refresh is not forced
    if not force_refresh and cache["data"] and (now - cache["last_fetched"] < CACHE_DURATION):
        response_data = cache["data"].copy()
        response_data["source"] = "cache"
        return jsonify(response_data)
        
    # Otherwise fetch live
    result = parse_release_notes()
    if result["success"]:
        cache["data"] = result
        cache["last_fetched"] = now
        result_copy = result.copy()
        result_copy["source"] = "live"
        return jsonify(result_copy)
    else:
        # If live fetch fails but we have cached version, fall back to cache
        if cache["data"]:
            result_copy = cache["data"].copy()
            result_copy["source"] = "cache"
            result_copy["warning"] = f"Feed refresh failed ({result['error']}), using cached data."
            return jsonify(result_copy)
        return jsonify(result), 500

if __name__ == '__main__':
    # Bind to all interfaces (0.0.0.0) on port 5000
    app.run(debug=True, host='0.0.0.0', port=5000)
