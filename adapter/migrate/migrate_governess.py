#!/usr/bin/env python3
"""
Governess / House Manager (VIP Estate) 131-record migration proof.
tbhrc/recruitment#16, Section 9/10.

Combines three sources into Candidate + Submission (candidate_joborder)
records through the live adapter API only -- no direct SQL, no Excel
runtime dependency (the workbook here is read once, offline, as historical
migration evidence per Section 8, exactly as the Issue permits).

Sources:
  1. GitHub sourcing pool (candidates.csv) -- 119 public/LinkedIn-sourced
     prospects. No email/phone by design (privacy policy in that repo's
     own README: contact details never go to GitHub).
  2. Manatal export ("Raw Import" sheet) -- 6 records, full contact detail.
  3. GulfTalent export ("Raw GulfTalent" sheet) -- 6 records, full contact
     detail plus GulfTalent's own candidate id/ref (Source Candidate ID /
     Source Ref, Section 5 fields 29-31).

GH-9 (Wilfredo V., priority "MOVED") is excluded -- moved to the VIP
Estate Butler vacancy, per the Issue's explicit instruction.

Every write goes through POST/PATCH on the adapter, actor "migration-governess",
so every created row is in tb_adapter_audit_log same as any other agent write.
"""
import csv
import json
import sys
import urllib.request
import urllib.error

ADAPTER_BASE = "http://127.0.0.1:3012/api"
ACTOR = "migration-governess"
JOB_ORDER_ID = 1  # Governess / House Manager, created earlier this session

CANDIDATES_CSV = "candidates.csv"
XLSX_PATH = "ATS-Governess-House-Manager.xlsx"


def call(method, path, token, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f"{ADAPTER_BASE}{path}", data=data, method=method)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("X-Actor", ACTOR)
    if data:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read())
        except Exception:
            return e.code, {"error": str(e)}


def split_name(full_name):
    parts = full_name.strip().split()
    if len(parts) == 1:
        return parts[0], "(no last name given)"
    return parts[0], " ".join(parts[1:])


def create_and_submit(token, first, last, extra_candidate_fields, report, row_label):
    code, body = call("POST", "/candidates", token, extra_candidate_fields | {"firstName": first, "lastName": last})
    if code not in (200, 201):
        report["skipped"].append({"row": row_label, "reason": f"candidate create failed: {body}"})
        return None
    candidate_id = body["candidateId"]
    report["created_candidates"] += 1

    code, body = call("POST", "/submissions", token, {"candidateId": candidate_id, "jobOrderId": JOB_ORDER_ID})
    if code == 409:
        report["skipped"].append({"row": row_label, "reason": "duplicate submission (already exists)"})
        return candidate_id
    if code not in (200, 201):
        report["skipped"].append({"row": row_label, "reason": f"submission create failed: {body}"})
        return candidate_id
    report["created_submissions"] += 1
    return candidate_id


def migrate_github_pool(token, report):
    with open(CANDIDATES_CSV, newline="", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    for row in rows:
        if row["priority"] == "MOVED":
            report["skipped"].append({"row": f"GH-{row['id']}", "reason": "MOVED -- excluded from Governess pool (Butler vacancy)"})
            continue
        first, last = split_name(row["name"])
        notes = (
            f"Track: {row['track']}\n"
            f"Priority: {row['priority']}\n"
            f"Availability (public): {row['availability_publicly_stated']}\n"
            f"Private household evidence: {row['private_household_evidence']}\n"
            f"Childcare/education evidence: {row['childcare_education_evidence']}\n"
            f"Household coordination evidence: {row['household_coordination_evidence']}\n"
            f"Trial readiness: {row['trial_readiness']}\n"
            f"Travel readiness: {row['travel_readiness']}\n"
            f"To verify: {row['next_verification']}"
        )
        candidate_id = create_and_submit(
            token, first, last,
            {
                "city": row["public_location"] or None,
                "source": "GitHub Sourcing",
                "sourceRef": f"GH-{row['id']}",
                "sourceProfileUrl": row["public_profile_url"] or None,
                "notes": notes,
                "extraFields": {"priority": row["priority"]},
            },
            report, f"GH-{row['id']} {row['name']}",
        )
        if candidate_id:
            report["github_count"] += 1


def excel_rows(sheet_name):
    # Read via a tiny embedded XLSX reader (openpyxl not guaranteed present
    # on the VPS) is overkill; the CSV siblings are generated alongside this
    # script instead -- see prepare step in the accompanying shell wrapper.
    with open(f"{sheet_name}.csv", newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def migrate_manatal(token, report):
    for row in excel_rows("raw_import"):
        name = row["Candidate Name"].strip()
        if not name:
            continue
        first, last = split_name(name)
        notes = (
            f"Current position: {row['Current Position']} at {row['Current Company']}\n"
            f"Experience: {row['Years of Experience']} years ({row['Years Working in UAE']} in UAE)\n"
            f"University/Diploma: {row['University']} / {row['Diploma']}\n"
            f"Visa status: {row['Visa Status']}; Driving license: {row['Driving License']}\n"
            f"Notice period: {row['Notice Period']}\n"
            f"Languages: {row['Languages']}\n"
            f"Current salary: {row['Current Salary']}"
        )
        candidate_id = create_and_submit(
            token, first, last,
            {
                "email": row["Candidate Email Address"] or None,
                "phone": row["Candidate Phone Number"] or None,
                "city": row["Candidate Location"] or None,
                "currentEmployer": row["Current Company"] or None,
                "desiredPay": row["Expected Salary"] or None,
                "currentPay": row["Current Salary"] or None,
                "source": "Manatal",
                "notes": notes,
                "extraFields": {
                    "nationality": row["Nationalities"],
                    "gender": row["Gender"],
                    "birthdate": row["Birthdate"],
                },
            },
            report, f"Manatal {name}",
        )
        if candidate_id:
            report["manatal_count"] += 1


def migrate_gulftalent(token, report):
    for row in excel_rows("raw_gulftalent"):
        name = row["name"].strip()
        if not name:
            continue
        first, last = split_name(name)
        notes = f"Position: {row['position']}\nExpected salary: {row['expected_salary']}"
        candidate_id = create_and_submit(
            token, first, last,
            {
                "email": row["email"] or None,
                "phone": row["phone"] or None,
                "desiredPay": row["expected_salary"] or None,
                "source": "GulfTalent",
                "sourceRef": row["gulftalent_ref"] or None,
                "sourceCandidateId": row["gulftalent_id"] or None,
                "sourceProfileUrl": row["profile_url"] or None,
                "notes": notes,
                "extraFields": {"nationality": row["nationality"]},
            },
            report, f"GulfTalent {name}",
        )
        if candidate_id:
            report["gulftalent_count"] += 1


def main():
    token = sys.argv[1]
    report = {
        "created_candidates": 0,
        "created_submissions": 0,
        "github_count": 0,
        "manatal_count": 0,
        "gulftalent_count": 0,
        "skipped": [],
    }
    migrate_github_pool(token, report)
    migrate_manatal(token, report)
    migrate_gulftalent(token, report)

    code, candidates = call("GET", f"/joborders/{JOB_ORDER_ID}/candidates", token)
    report["final_submission_count"] = len(candidates) if code == 200 else None

    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
