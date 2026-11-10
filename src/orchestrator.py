"""
Part 7: The Master Cloud Orchestrator
Executes the entire data intelligence pipeline from start to finish:
Harvest -> Unmask -> Enrich -> AI Dossier -> Master Database Storage.
Designed to be triggered automatically by GitHub Actions daily cron.
"""

import logging
import sys
import os
import json
from datetime import datetime, timezone
from typing import Dict, Any

from src.harvester import run_harvest
from src.unmasker import process_all_leads
from src.enricher import enrich_all_leads
from src.dossier import generate_all_dossiers
from src.database import load_dossier_data_into_db, get_db_connection

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)


def run_full_autonomous_pipeline() -> Dict[str, Any]:
    """
    Executes all 5 stages of the autonomous data engine sequentially.
    Returns operational health metrics and lead counts.
    """
    start_time = datetime.now(timezone.utc)
    logging.info("=" * 70)
    logging.info("AUTONOMOUS CLOUD PIPELINE STARTING")
    logging.info(f"Execution Timestamp (UTC): {start_time.isoformat()}")
    logging.info("=" * 70)

    # Stage 1: Municipal Data Harvest & Deduplication
    logging.info("\n>>> [STAGE 1/5] Harvesting Municipal Permitting Endpoints...")
    harvested = run_harvest()
    logging.info(f"✓ Stage 1 Complete: {len(harvested)} qualified commercial leads harvested.")

    # Stage 2: Corporate Entity Unmasking (LLC -> Real Human)
    logging.info("\n>>> [STAGE 2/5] Unmasking Corporate Entities & Founders...")
    unmasked = process_all_leads()
    unmasked_count = sum(1 for l in unmasked if l.get("is_unmasked"))
    logging.info(f"✓ Stage 2 Complete: {unmasked_count} verified decision makers identified.")

    # Stage 3: Phone & Contact Channel Discovery
    logging.info("\n>>> [STAGE 3/5] Discovering Verified Phone Numbers & LinkedIn Profiles...")
    enriched = enrich_all_leads()
    phone_count = sum(1 for l in enriched if l.get("has_direct_phone"))
    logging.info(f"✓ Stage 3 Complete: {phone_count} verified direct cell/office phones attached.")

    # Stage 4: AI Sales Dossier Generation
    logging.info("\n>>> [STAGE 4/5] Generating 3-Bullet AI Sales Dossiers...")
    dossiers = generate_all_dossiers()
    logging.info(f"✓ Stage 4 Complete: {len(dossiers)} AI briefings generated.")

    # Stage 5: Master Relational Database Storage
    logging.info("\n>>> [STAGE 5/5] Upserting Records into Master Database...")
    db_count = load_dossier_data_into_db()
    logging.info(f"✓ Stage 5 Complete: {db_count} records indexed and ready in master database.")

    end_time = datetime.now(timezone.utc)
    duration_sec = round((end_time - start_time).total_seconds(), 2)

    metrics = {
        "status": "SUCCESS",
        "start_time": start_time.isoformat(),
        "duration_seconds": duration_sec,
        "total_leads_in_pipeline": len(harvested),
        "unmasked_decision_makers": unmasked_count,
        "verified_direct_phones": phone_count,
        "database_records_ready": db_count
    }

    logging.info("=" * 70)
    logging.info("PIPELINE COMPLETED SUCCESSFULLY")
    logging.info(f"Duration: {duration_sec}s | Total Database Leads: {db_count}")
    logging.info("=" * 70)

    return metrics


if __name__ == "__main__":
    report = run_full_autonomous_pipeline()
    print("\nOPERATIONAL PIPELINE HEALTH REPORT:")
    print(json.dumps(report, indent=2))

