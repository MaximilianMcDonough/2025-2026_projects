"""
Google Earth Engine satellite data fetcher.

Requires:
    pip install earthengine-api
    earthengine authenticate   # one-time OAuth setup
"""

import ee


class SatelliteData:
    """Fetch and sort satellite imagery from Google Earth Engine."""

    COLLECTIONS = {
        "landsat8":   "LANDSAT/LC08/C02/T1_L2",
        "landsat9":   "LANDSAT/LC09/C02/T1_L2",
        "sentinel2":  "COPERNICUS/S2_SR_HARMONIZED",
        "modis":      "MODIS/061/MOD09GA",
    }

    def __init__(self, project: str | None = None):
        """
        Initialize and authenticate with Earth Engine.

        Args:
            project: GCP project ID tied to your EE account, e.g. "my-gee-project".
                     If None, EE uses the default project from `earthengine authenticate`.
        """
        if project:
            ee.Initialize(project=project)
        else:
            ee.Initialize()

    # ------------------------------------------------------------------
    # Region helpers
    # ------------------------------------------------------------------

    @staticmethod
    def bbox(west: float, south: float, east: float, north: float) -> ee.Geometry:
        """Return an EE geometry from bounding-box coordinates (degrees)."""
        return ee.Geometry.BBox(west, south, east, north)

    @staticmethod
    def point(lon: float, lat: float, buffer_km: float = 10) -> ee.Geometry:
        """Return a circular region centred on a point."""
        return ee.Geometry.Point([lon, lat]).buffer(buffer_km * 1000)

    # ------------------------------------------------------------------
    # Fetching
    # ------------------------------------------------------------------

    def fetch(
        self,
        region: ee.Geometry,
        start: str,
        end: str,
        source: str = "sentinel2",
        max_cloud_pct: float = 20.0,
    ) -> ee.ImageCollection:
        """
        Fetch an image collection filtered to a region and date range.

        Args:
            region:        EE geometry (use bbox() or point() helpers).
            start:         Start date string "YYYY-MM-DD".
            end:           End date string "YYYY-MM-DD".
            source:        One of 'landsat8', 'landsat9', 'sentinel2', 'modis'.
            max_cloud_pct: Maximum cloud cover percentage to include.

        Returns:
            Filtered ee.ImageCollection.
        """
        if source not in self.COLLECTIONS:
            raise ValueError(f"Unknown source '{source}'. Choose from: {list(self.COLLECTIONS)}")

        cloud_prop = "CLOUD_COVERAGE_ASSESSMENT" if source.startswith("sentinel") else "CLOUD_COVER"

        collection = (
            ee.ImageCollection(self.COLLECTIONS[source])
            .filterBounds(region)
            .filterDate(start, end)
            .filter(ee.Filter.lte(cloud_prop, max_cloud_pct))
        )
        return collection

    # ------------------------------------------------------------------
    # Sorting
    # ------------------------------------------------------------------

    def sort_by_date(self, collection: ee.ImageCollection, ascending: bool = True) -> ee.ImageCollection:
        """Sort images chronologically."""
        return collection.sort("system:time_start", ascending)

    def sort_by_cloud(self, collection: ee.ImageCollection, source: str = "sentinel2") -> ee.ImageCollection:
        """Sort images from least to most cloudy."""
        cloud_prop = "CLOUD_COVERAGE_ASSESSMENT" if source.startswith("sentinel") else "CLOUD_COVER"
        return collection.sort(cloud_prop)

    def sort_by_quality(self, collection: ee.ImageCollection) -> ee.ImageCollection:
        """Sort by overall scene quality score (where available)."""
        return collection.sort("GEOMETRIC_RMSE_MODEL", ascending=True)

    # ------------------------------------------------------------------
    # Inspection helpers
    # ------------------------------------------------------------------

    def count(self, collection: ee.ImageCollection) -> int:
        """Return the number of images in a collection."""
        return collection.size().getInfo()

    def metadata(self, collection: ee.ImageCollection, limit: int = 10) -> list[dict]:
        """
        Return a list of property dicts for the first `limit` images.

        Each dict includes date, cloud cover, and the image ID.
        """
        images = collection.limit(limit).getInfo()["features"]
        results = []
        for img in images:
            props = img["properties"]
            results.append({
                "id":         img["id"],
                "date":       props.get("DATE_ACQUIRED") or props.get("DATATAKE_IDENTIFIER", ""),
                "cloud_pct":  props.get("CLOUD_COVERAGE_ASSESSMENT") or props.get("CLOUD_COVER"),
                "spacecraft": props.get("SPACECRAFT_NAME") or props.get("SPACECRAFT_ID", ""),
            })
        return results

    def best_image(self, collection: ee.ImageCollection, source: str = "sentinel2") -> ee.Image:
        """Return the single least-cloudy image from the collection."""
        return self.sort_by_cloud(collection, source).first()

    # ------------------------------------------------------------------
    # Export
    # ------------------------------------------------------------------

    def export_to_drive(
        self,
        image: ee.Image,
        region: ee.Geometry,
        description: str = "satellite_export",
        folder: str = "EarthEngine",
        scale: int = 10,
        bands: list[str] | None = None,
    ) -> ee.batch.Task:
        """
        Export an image to Google Drive and start the task.

        Args:
            image:       ee.Image to export.
            region:      Export region.
            description: Task name (also used as the output filename).
            folder:      Drive folder name.
            scale:       Pixel resolution in metres (10 m for Sentinel-2).
            bands:       Band names to export; None exports all bands.

        Returns:
            The started ee.batch.Task.
        """
        if bands:
            image = image.select(bands)

        task = ee.batch.Export.image.toDrive(
            image=image,
            description=description,
            folder=folder,
            region=region,
            scale=scale,
            maxPixels=1e13,
        )
        task.start()
        print(f"Export task '{description}' started. Check progress at code.earthengine.google.com/tasks")
        return task


# ----------------------------------------------------------------------
# Quick demo
# ----------------------------------------------------------------------

if __name__ == "__main__":
    sd = SatelliteData()  # pass project="your-project-id" if needed

    # 10 km radius around London
    region = sd.point(lon=-0.1276, lat=51.5074, buffer_km=10)

    # Fetch low-cloud Sentinel-2 scenes from 2024
    col = sd.fetch(region, start="2024-06-01", end="2024-09-01", source="sentinel2", max_cloud_pct=10)

    print(f"Found {sd.count(col)} images")

    # Sort by date and print metadata
    col_sorted = sd.sort_by_date(col)
    for entry in sd.metadata(col_sorted, limit=5):
        print(entry)

    # Export the clearest single image
    best = sd.best_image(col, source="sentinel2")
    sd.export_to_drive(
        image=best,
        region=region,
        description="london_sentinel2_2024",
        bands=["B4", "B3", "B2"],  # RGB
        scale=10,
    )
