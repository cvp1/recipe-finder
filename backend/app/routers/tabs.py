from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import RecipeTab, RecipeTabRecipe
from app.schemas import AddRecipesToTab, RecipeTabCreate, RecipeTabOut, RecipeTabUpdate

router = APIRouter(tags=["tabs"])


def _tab_to_out(tab: RecipeTab, db: Session) -> RecipeTabOut:
    count = db.query(func.count(RecipeTabRecipe.id)).filter(
        RecipeTabRecipe.tab_id == tab.id
    ).scalar() or 0
    return RecipeTabOut(
        id=tab.id,
        name=tab.name,
        position=tab.position,
        recipe_count=count,
    )


@router.get("/tabs", response_model=list[RecipeTabOut])
def list_tabs(db: Session = Depends(get_db)):
    tabs = db.query(RecipeTab).order_by(RecipeTab.position, RecipeTab.id).all()
    return [_tab_to_out(t, db) for t in tabs]


@router.post("/tabs", response_model=RecipeTabOut, status_code=201)
def create_tab(body: RecipeTabCreate, db: Session = Depends(get_db)):
    max_pos = db.query(func.max(RecipeTab.position)).scalar() or 0
    tab = RecipeTab(name=body.name, position=max_pos + 1)
    db.add(tab)
    db.commit()
    db.refresh(tab)
    return _tab_to_out(tab, db)


@router.put("/tabs/{tab_id}", response_model=RecipeTabOut)
def update_tab(tab_id: int, body: RecipeTabUpdate, db: Session = Depends(get_db)):
    tab = db.query(RecipeTab).filter(RecipeTab.id == tab_id).first()
    if not tab:
        raise HTTPException(status_code=404, detail="Tab not found")
    if body.name is not None:
        tab.name = body.name
    if body.position is not None:
        tab.position = body.position
    db.commit()
    db.refresh(tab)
    return _tab_to_out(tab, db)


@router.delete("/tabs/{tab_id}")
def delete_tab(tab_id: int, db: Session = Depends(get_db)):
    tab = db.query(RecipeTab).filter(RecipeTab.id == tab_id).first()
    if not tab:
        raise HTTPException(status_code=404, detail="Tab not found")
    db.delete(tab)
    db.commit()
    return {"status": "deleted"}


@router.post("/tabs/{tab_id}/recipes", response_model=RecipeTabOut)
def add_recipes_to_tab(
    tab_id: int, body: AddRecipesToTab, db: Session = Depends(get_db)
):
    tab = db.query(RecipeTab).filter(RecipeTab.id == tab_id).first()
    if not tab:
        raise HTTPException(status_code=404, detail="Tab not found")
    for recipe_id in body.recipe_ids:
        existing = (
            db.query(RecipeTabRecipe)
            .filter(RecipeTabRecipe.tab_id == tab_id, RecipeTabRecipe.recipe_id == recipe_id)
            .first()
        )
        if not existing:
            db.add(RecipeTabRecipe(tab_id=tab_id, recipe_id=recipe_id))
    db.commit()
    db.refresh(tab)
    return _tab_to_out(tab, db)


@router.delete("/tabs/{tab_id}/recipes/{recipe_id}")
def remove_recipe_from_tab(
    tab_id: int, recipe_id: str, db: Session = Depends(get_db)
):
    link = (
        db.query(RecipeTabRecipe)
        .filter(RecipeTabRecipe.tab_id == tab_id, RecipeTabRecipe.recipe_id == recipe_id)
        .first()
    )
    if not link:
        raise HTTPException(status_code=404, detail="Recipe not in this tab")
    db.delete(link)
    db.commit()
    return {"status": "removed"}


@router.get("/tabs/recipe/{recipe_id}", response_model=list[int])
def get_recipe_tabs(recipe_id: str, db: Session = Depends(get_db)):
    """Return list of tab IDs that contain this recipe."""
    links = (
        db.query(RecipeTabRecipe.tab_id)
        .filter(RecipeTabRecipe.recipe_id == recipe_id)
        .all()
    )
    return [link.tab_id for link in links]
